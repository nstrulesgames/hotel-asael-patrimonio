import { env } from "cloudflare:workers";

type StoreUser = { id: number; name: string; email: string; role: "PROPIETARIO" | "ADMINISTRADOR" | "RECEPCION" };
type StorePayload = Record<string, unknown> & { action?: string };
type StockBatch = { id: number; quantity: number; unit_cost_cents: number; expires_on: string | null };

async function currentStoreUser(request: Request) {
  const url = new URL(request.url);
  const externalId = request.headers.get("oai-authenticated-user-id") || (url.hostname === "localhost" || url.hostname === "127.0.0.1" ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  if (!externalId) return null;
  return env.DB.prepare("SELECT id, name, email, role FROM users WHERE (external_id = ? OR lower(email) = lower(?)) AND active = 1 LIMIT 1")
    .bind(externalId, email).first<StoreUser>();
}

async function ensureLocations() {
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO stock_locations (code, name, active, created_at) VALUES ('MAIN', 'Almacén principal', 1, ?)").bind(now),
    env.DB.prepare("INSERT OR IGNORE INTO stock_locations (code, name, active, created_at) VALUES ('RECEPTION', 'Stock de recepción', 1, ?)").bind(now),
  ]);
}

function isAdministrator(user: StoreUser) {
  return user.role === "PROPIETARIO" || user.role === "ADMINISTRADOR";
}

function cleanText(value: unknown, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : -1;
}

function apiError(error: unknown) {
  console.error("Store API error", error);
  return Response.json({ error: "No se pudo completar la operación de almacén. Intenta nuevamente." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const user = await currentStoreUser(request);
    if (!user) return Response.json({ error: "Tu correo no tiene acceso activo." }, { status: 403 });
    await ensureLocations();
    const admin = isAdministrator(user);
    const [locations, products, movements, expiring] = await Promise.all([
      env.DB.prepare("SELECT id, code, name, active FROM stock_locations WHERE active = 1 ORDER BY CASE code WHEN 'MAIN' THEN 0 ELSE 1 END").all(),
      env.DB.prepare(`SELECT p.*,
        COALESCE(SUM(CASE WHEN location.code = 'MAIN' THEN batch.quantity ELSE 0 END), 0) AS main_stock,
        COALESCE(SUM(CASE WHEN location.code = 'RECEPTION' THEN batch.quantity ELSE 0 END), 0) AS reception_stock,
        COALESCE(SUM(batch.quantity), 0) AS total_stock,
        MIN(CASE WHEN batch.quantity > 0 AND batch.expires_on IS NOT NULL THEN batch.expires_on END) AS next_expiry
        FROM commercial_products p
        LEFT JOIN stock_batches batch ON batch.product_id = p.id AND batch.quantity > 0
        LEFT JOIN stock_locations location ON location.id = batch.location_id
        GROUP BY p.id ORDER BY p.active DESC, p.name COLLATE NOCASE`).all<Record<string, unknown>>(),
      env.DB.prepare(`SELECT movement.*, product.name AS product_name, product.sale_unit,
        source.name AS from_location_name, destination.name AS to_location_name
        FROM stock_movements movement JOIN commercial_products product ON product.id = movement.product_id
        LEFT JOIN stock_locations source ON source.id = movement.from_location_id
        LEFT JOIN stock_locations destination ON destination.id = movement.to_location_id
        ${admin ? "" : "WHERE source.code = 'RECEPTION' OR destination.code = 'RECEPTION'"}
        ORDER BY movement.created_at DESC LIMIT 100`).all<Record<string, unknown>>(),
      env.DB.prepare(`SELECT batch.id, batch.product_id, product.name AS product_name, location.name AS location_name, batch.quantity, batch.expires_on
        FROM stock_batches batch JOIN commercial_products product ON product.id = batch.product_id JOIN stock_locations location ON location.id = batch.location_id
        WHERE batch.quantity > 0 AND batch.expires_on IS NOT NULL AND date(batch.expires_on) <= date('now', '+30 days')
        ORDER BY batch.expires_on, product.name`).all(),
    ]);
    const safeProducts = products.results.map((product) => admin ? product : { ...product, average_cost_cents: null, main_stock: null });
    const safeMovements = movements.results.map((movement) => admin ? movement : { ...movement, total_cost_cents: null });
    return Response.json({ user: { name: user.name, role: user.role }, locations: locations.results, products: safeProducts, movements: safeMovements, expiring: expiring.results });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentStoreUser(request);
    if (!user) return Response.json({ error: "Tu correo no tiene acceso activo." }, { status: 403 });
    if (!isAdministrator(user)) return Response.json({ error: "Solo Administración puede modificar catálogo o existencias." }, { status: 403 });
    await ensureLocations();
    const body = await request.json() as StorePayload;
    const now = new Date().toISOString();

    if (body.action === "product_save") {
      const productId = Number(body.productId || 0);
      const sku = cleanText(body.sku, 30).toUpperCase().replace(/\s+/g, "-");
      const name = cleanText(body.name, 100);
      const category = cleanText(body.category, 50).toUpperCase() || "OTROS";
      const purchaseUnit = cleanText(body.purchaseUnit, 30);
      const saleUnit = cleanText(body.saleUnit, 30);
      const unitsPerPurchase = positiveInteger(body.unitsPerPurchase);
      const salePriceCents = nonNegativeInteger(body.salePriceCents);
      const minimumStock = nonNegativeInteger(body.minimumStock);
      const tracksExpiry = body.tracksExpiry === true ? 1 : 0;
      if (!/^[A-Z0-9-]{2,30}$/.test(sku) || !name || !purchaseUnit || !saleUnit || !unitsPerPurchase || salePriceCents < 0 || minimumStock < 0) {
        return Response.json({ error: "Completa correctamente código, nombre, unidades, precio y stock mínimo." }, { status: 400 });
      }
      const duplicate = await env.DB.prepare("SELECT id FROM commercial_products WHERE (sku = ? OR lower(name) = lower(?)) AND id != ? LIMIT 1").bind(sku, name, productId).first();
      if (duplicate) return Response.json({ error: "Ya existe un producto con ese código o nombre." }, { status: 409 });
      if (productId) {
        const existing = await env.DB.prepare("SELECT id FROM commercial_products WHERE id = ?").bind(productId).first();
        if (!existing) return Response.json({ error: "El producto ya no existe." }, { status: 404 });
        await env.DB.batch([
          env.DB.prepare("UPDATE commercial_products SET sku = ?, name = ?, category = ?, purchase_unit = ?, sale_unit = ?, units_per_purchase = ?, sale_price_cents = ?, minimum_stock = ?, tracks_expiry = ?, updated_by = ?, updated_at = ? WHERE id = ?")
            .bind(sku, name, category, purchaseUnit, saleUnit, unitsPerPurchase, salePriceCents, minimumStock, tracksExpiry, user.name, now, productId),
          env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, reason, created_at) VALUES (?, ?, ?, 'PRODUCTO_EDITADO', 'COMMERCIAL_PRODUCT', ?, 'Actualización de catálogo comercial', ?)")
            .bind(user.id, user.name, user.role, productId, now),
        ]);
        return Response.json({ ok: true, productId });
      }
      const inserted = await env.DB.prepare("INSERT INTO commercial_products (sku, name, category, purchase_unit, sale_unit, units_per_purchase, sale_price_cents, average_cost_cents, minimum_stock, tracks_expiry, active, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)")
        .bind(sku, name, category, purchaseUnit, saleUnit, unitsPerPurchase, salePriceCents, minimumStock, tracksExpiry, user.name, now).run();
      const newId = Number(inserted.meta.last_row_id);
      await env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, reason, created_at) VALUES (?, ?, ?, 'PRODUCTO_CREADO', 'COMMERCIAL_PRODUCT', ?, 'Alta en catálogo comercial', ?)")
        .bind(user.id, user.name, user.role, newId, now).run();
      return Response.json({ ok: true, productId: newId });
    }

    if (body.action === "product_toggle") {
      const productId = positiveInteger(body.productId);
      const active = body.active === true ? 1 : 0;
      const reason = cleanText(body.reason, 250);
      if (!productId || !reason) return Response.json({ error: "Indica el producto y el motivo del cambio." }, { status: 400 });
      await env.DB.batch([
        env.DB.prepare("UPDATE commercial_products SET active = ?, updated_by = ?, updated_at = ? WHERE id = ?").bind(active, user.name, now, productId),
        env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, new_value, reason, created_at) VALUES (?, ?, ?, 'PRODUCTO_ESTADO', 'COMMERCIAL_PRODUCT', ?, ?, ?, ?)")
          .bind(user.id, user.name, user.role, productId, active ? "ACTIVO" : "INACTIVO", reason, now),
      ]);
      return Response.json({ ok: true });
    }

    if (body.action === "stock_entry") {
      const productId = positiveInteger(body.productId);
      const purchaseQuantity = positiveInteger(body.purchaseQuantity);
      const purchaseCostCents = nonNegativeInteger(body.purchaseCostCents);
      const reason = cleanText(body.reason, 250);
      const responsible = cleanText(body.responsible, 100);
      const expiresOn = cleanText(body.expiresOn, 10) || null;
      const product = await env.DB.prepare("SELECT id, units_per_purchase, average_cost_cents, tracks_expiry FROM commercial_products WHERE id = ? AND active = 1").bind(productId).first<{ id: number; units_per_purchase: number; average_cost_cents: number; tracks_expiry: number }>();
      const main = await env.DB.prepare("SELECT id FROM stock_locations WHERE code = 'MAIN' AND active = 1").first<{ id: number }>();
      if (!product || !main || !purchaseQuantity || purchaseCostCents < 0 || !reason || !responsible) return Response.json({ error: "Completa producto, cantidad, costo, motivo y responsable." }, { status: 400 });
      if (product.tracks_expiry && (!expiresOn || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn))) return Response.json({ error: "Este producto requiere una fecha de vencimiento válida." }, { status: 400 });
      if (expiresOn && expiresOn < now.slice(0, 10)) return Response.json({ error: "No se puede ingresar un lote ya vencido." }, { status: 400 });
      const baseQuantity = purchaseQuantity * product.units_per_purchase;
      const totalCostCents = purchaseQuantity * purchaseCostCents;
      const unitCostCents = Math.round(totalCostCents / baseQuantity);
      const current = await env.DB.prepare("SELECT COALESCE(SUM(quantity), 0) AS quantity, COALESCE(SUM(quantity * unit_cost_cents), 0) AS cost FROM stock_batches WHERE product_id = ? AND quantity > 0").bind(productId).first<{ quantity: number; cost: number }>();
      const newAverage = Math.round(((current?.cost || 0) + totalCostCents) / ((current?.quantity || 0) + baseQuantity));
      await env.DB.batch([
        env.DB.prepare("INSERT INTO stock_batches (product_id, location_id, quantity, unit_cost_cents, expires_on, received_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(productId, main.id, baseQuantity, unitCostCents, expiresOn, now, user.name),
        env.DB.prepare("INSERT INTO stock_movements (product_id, from_location_id, to_location_id, movement_type, quantity, total_cost_cents, reason, responsible, created_by, created_at) VALUES (?, NULL, ?, 'ENTRADA', ?, ?, ?, ?, ?, ?)")
          .bind(productId, main.id, baseQuantity, totalCostCents, reason, responsible, user.name, now),
        env.DB.prepare("UPDATE commercial_products SET average_cost_cents = ?, updated_by = ?, updated_at = ? WHERE id = ?").bind(newAverage, user.name, now, productId),
        env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, new_value, reason, created_at) VALUES (?, ?, ?, 'STOCK_INGRESO', 'COMMERCIAL_PRODUCT', ?, ?, ?, ?)")
          .bind(user.id, user.name, user.role, productId, String(baseQuantity), reason, now),
      ]);
      return Response.json({ ok: true, quantity: baseQuantity });
    }

    if (body.action === "stock_transfer") {
      const productId = positiveInteger(body.productId);
      const quantity = positiveInteger(body.quantity);
      const reason = cleanText(body.reason, 250);
      const responsible = cleanText(body.responsible, 100);
      if (!productId || !quantity || !reason || !responsible) return Response.json({ error: "Completa producto, cantidad, motivo y responsable." }, { status: 400 });
      const locations = await env.DB.prepare("SELECT id, code FROM stock_locations WHERE code IN ('MAIN', 'RECEPTION') AND active = 1").all<{ id: number; code: string }>();
      const main = locations.results.find((location) => location.code === "MAIN");
      const reception = locations.results.find((location) => location.code === "RECEPTION");
      if (!main || !reception) return Response.json({ error: "Las ubicaciones de almacén no están disponibles." }, { status: 409 });
      const batches = await env.DB.prepare("SELECT id, quantity, unit_cost_cents, expires_on FROM stock_batches WHERE product_id = ? AND location_id = ? AND quantity > 0 ORDER BY CASE WHEN expires_on IS NULL THEN 1 ELSE 0 END, expires_on, received_at, id")
        .bind(productId, main.id).all<StockBatch>();
      const available = batches.results.reduce((sum, batch) => sum + batch.quantity, 0);
      if (available < quantity) return Response.json({ error: `El almacén principal solo dispone de ${available} unidades.` }, { status: 409 });
      let remaining = quantity;
      let totalCostCents = 0;
      const statements = [];
      for (const batch of batches.results) {
        if (!remaining) break;
        const moved = Math.min(batch.quantity, remaining);
        remaining -= moved;
        totalCostCents += moved * batch.unit_cost_cents;
        statements.push(env.DB.prepare("UPDATE stock_batches SET quantity = quantity - ? WHERE id = ? AND quantity >= ?").bind(moved, batch.id, moved));
        statements.push(env.DB.prepare("INSERT INTO stock_batches (product_id, location_id, quantity, unit_cost_cents, expires_on, received_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(productId, reception.id, moved, batch.unit_cost_cents, batch.expires_on, now, user.name));
      }
      statements.push(env.DB.prepare("INSERT INTO stock_movements (product_id, from_location_id, to_location_id, movement_type, quantity, total_cost_cents, reason, responsible, created_by, created_at) VALUES (?, ?, ?, 'TRANSFERENCIA', ?, ?, ?, ?, ?, ?)")
        .bind(productId, main.id, reception.id, quantity, totalCostCents, reason, responsible, user.name, now));
      statements.push(env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, new_value, reason, created_at) VALUES (?, ?, ?, 'STOCK_TRANSFERENCIA', 'COMMERCIAL_PRODUCT', ?, ?, ?, ?)")
        .bind(user.id, user.name, user.role, productId, String(quantity), reason, now));
      await env.DB.batch(statements);
      return Response.json({ ok: true, quantity });
    }

    return Response.json({ error: "Acción de almacén no reconocida." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
