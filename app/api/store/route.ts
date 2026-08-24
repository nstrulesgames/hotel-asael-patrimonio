import { env } from "cloudflare:workers";

type StoreUser = { id: number; name: string; email: string; role: "PROPIETARIO" | "ADMINISTRADOR" | "RECEPCION" };
type StorePayload = Record<string, unknown> & { action?: string };
type StockBatch = { id: number; quantity: number; unit_cost_cents: number; expires_on: string | null };
type SaleItemInput = { productId: number; quantity: number };

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

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function money(cents: number) {
  return `Bs ${(cents / 100).toFixed(2)}`;
}

async function saleReceipt(user: StoreUser, saleNumber: string) {
  const sale = await env.DB.prepare(`SELECT sale.*, room.number AS room_number, guest.full_name AS consumer_name
    FROM sales sale LEFT JOIN rooms room ON room.id = sale.room_id LEFT JOIN guests guest ON guest.id = sale.consumer_guest_id
    WHERE sale.sale_number = ? LIMIT 1`).bind(saleNumber).first<Record<string, unknown>>();
  if (!sale) return new Response("Comprobante no encontrado", { status: 404 });
  const items = await env.DB.prepare("SELECT product_name, product_sku, quantity, unit_price_cents, total_price_cents FROM sale_items WHERE sale_id = ? ORDER BY id")
    .bind(sale.id).all<Record<string, unknown>>();
  const [payments, returns] = await Promise.all([
    env.DB.prepare("SELECT payment_method, amount_cents, reference, received_at FROM sale_payments WHERE sale_id = ? ORDER BY received_at").bind(sale.id).all<Record<string, unknown>>(),
    env.DB.prepare("SELECT return_number, refund_method, refund_amount_cents, created_at FROM sale_returns WHERE sale_id = ? ORDER BY created_at").bind(sale.id).all<Record<string, unknown>>(),
  ]);
  const previousPrints = Number(sale.print_count || 0);
  const now = new Date().toISOString();
  const statements = [env.DB.prepare("UPDATE sales SET print_count = print_count + 1 WHERE id = ?").bind(sale.id)];
  if (previousPrints > 0) statements.push(env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, reason, created_at) VALUES (?, ?, ?, 'COMPROBANTE_REIMPRESO', 'SALE', ?, ?, ?)")
    .bind(user.id, user.name, user.role, sale.id, `Reimpresión ${previousPrints + 1} de ${saleNumber}`, now));
  await env.DB.batch(statements);
  const rows = items.results.map((item) => `<tr><td>${escapeHtml(item.product_name)}</td><td>${item.quantity}</td><td>${money(Number(item.unit_price_cents))}</td><td>${money(Number(item.total_price_cents))}</td></tr>`).join("");
  const paidCents = payments.results.reduce((sum, payment) => sum + Number(payment.amount_cents), 0);
  const returnedCents = returns.results.reduce((sum, item) => sum + Number(item.refund_amount_cents), 0);
  const balanceCents = Math.max(0, Number(sale.total_cents) - paidCents - returnedCents);
  const paymentRows = payments.results.map((payment) => `<li>${escapeHtml(payment.payment_method)} · ${money(Number(payment.amount_cents))}${payment.reference ? ` · ${escapeHtml(payment.reference)}` : ""}</li>`).join("");
  const returnRows = returns.results.map((item) => `<li>${escapeHtml(item.return_number)} · ${escapeHtml(item.refund_method)} · ${money(Number(item.refund_amount_cents))}</li>`).join("");
  const reprint = previousPrints > 0 ? `<div class="reprint">REIMPRESIÓN #${previousPrints + 1}</div>` : "";
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(saleNumber)}</title><style>@page{margin:10mm}body{font:13px Arial,sans-serif;color:#17231e;max-width:720px;margin:24px auto}header{text-align:center;border-bottom:2px solid #1d5b43;padding-bottom:14px}h1{margin:0;font-size:24px}h2{font-size:16px}.reprint{margin:12px 0;padding:8px;border:2px solid #9b503a;color:#9b503a;font-weight:700;text-align:center}.facts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:18px 0}.facts span{padding:8px;background:#f3f5f2}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th:last-child,td:last-child{text-align:right}.total{text-align:right;font-size:18px;margin-top:16px}.ledger{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.ledger>div{padding:10px;background:#f4f5f2}.ledger h3{font-size:12px;margin:0 0 6px}.ledger ul{margin:0;padding-left:18px}.notes{margin-top:18px;padding:10px;background:#f7f7f4}.print{display:block;margin:20px auto;padding:10px 18px}@media print{.print{display:none}body{margin:0}}</style></head><body><header><h1>Hotel ASAEL</h1><p>Comprobante interno de venta</p><h2>${escapeHtml(saleNumber)}</h2></header>${reprint}<div class="facts"><span><b>Fecha:</b> ${escapeHtml(new Date(String(sale.created_at)).toLocaleString("es-BO"))}</span><span><b>Estado:</b> ${escapeHtml(sale.status)}</span><span><b>Tipo:</b> ${sale.sale_type === "HUESPED" ? `Huésped · Habitación ${escapeHtml(sale.room_number)}` : "Venta directa"}</span><span><b>Forma inicial:</b> ${escapeHtml(sale.payment_method)}</span><span><b>Cliente/consumidor:</b> ${escapeHtml(sale.consumer_name || sale.customer_name || "No registrado")}</span><span><b>Atendido por:</b> ${escapeHtml(sale.created_by_name)}</span></div><table><thead><tr><th>Producto</th><th>Cant.</th><th>P. unitario</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table><p class="total"><b>Total: ${money(Number(sale.total_cents))}</b><br>Pagado: ${money(paidCents)} · Devuelto: ${money(returnedCents)} · Saldo: ${money(balanceCents)}</p>${paymentRows || returnRows ? `<div class="ledger"><div><h3>Pagos</h3><ul>${paymentRows || "<li>Sin pagos</li>"}</ul></div><div><h3>Devoluciones</h3><ul>${returnRows || "<li>Sin devoluciones</li>"}</ul></div></div>` : ""}${sale.notes ? `<div class="notes"><b>Observaciones:</b> ${escapeHtml(sale.notes)}</div>` : ""}<button class="print" onclick="window.print()">Imprimir comprobante</button></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const user = await currentStoreUser(request);
    if (!user) return Response.json({ error: "Tu correo no tiene acceso activo." }, { status: 403 });
    await ensureLocations();
    const receiptNumber = cleanText(new URL(request.url).searchParams.get("receipt"), 30);
    if (receiptNumber) return saleReceipt(user, receiptNumber);
    const admin = isAdministrator(user);
    const [locations, products, movements, expiring, activeStays, occupants, recentSales, pendingByStay, currentCashSession, cashSessions, saleItems, payments, returns, periodReports, productReports, workerReports, paymentReports] = await Promise.all([
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
      env.DB.prepare(`SELECT stay.id, stay.room_id, room.number AS room_number, guest.id AS primary_guest_id, guest.full_name AS primary_guest_name
        FROM stays stay JOIN rooms room ON room.id = stay.room_id JOIN guests guest ON guest.id = stay.primary_guest_id
        WHERE stay.status = 'ACTIVA' ORDER BY CAST(room.number AS INTEGER), room.number`).all(),
      env.DB.prepare(`SELECT membership.stay_id, guest.id, guest.full_name, membership.is_primary
        FROM stay_guests membership JOIN guests guest ON guest.id = membership.guest_id
        WHERE membership.left_at IS NULL ORDER BY membership.is_primary DESC, guest.full_name COLLATE NOCASE`).all(),
      env.DB.prepare(`SELECT sale.id, sale.sale_number, sale.sale_type, sale.stay_id, sale.room_id, room.number AS room_number,
        sale.customer_name, sale.status, sale.payment_method, sale.total_cents, sale.print_count, sale.created_by_name, sale.created_at,
        sale.cancelled_by_name, sale.cancelled_at, sale.cancellation_reason, sale.cash_session_id,
        COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) AS paid_cents,
        COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0) AS returned_cents,
        MAX(0, sale.total_cents - COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0)) AS balance_cents
        FROM sales sale LEFT JOIN rooms room ON room.id = sale.room_id
        ${admin ? "" : "WHERE sale.cash_session_id = (SELECT id FROM cash_sessions WHERE status = 'ABIERTA' ORDER BY opened_at DESC LIMIT 1) OR sale.created_by_user_id = " + Number(user.id)}
        ORDER BY sale.created_at DESC LIMIT 100`).all(),
      env.DB.prepare(`SELECT sale.stay_id, COUNT(*) AS sale_count,
        COALESCE(SUM(MAX(0, sale.total_cents - COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0))), 0) AS pending_cents
        FROM sales sale WHERE sale.status = 'PENDIENTE' AND sale.stay_id IS NOT NULL GROUP BY sale.stay_id`).all(),
      env.DB.prepare(`SELECT session.*,
        COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.cash_session_id = session.id AND payment.payment_method = 'EFECTIVO'), 0) AS cash_income_cents,
        COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.cash_session_id = session.id AND ret.refund_method = 'EFECTIVO'), 0) AS cash_refund_cents,
        COALESCE((SELECT COUNT(*) FROM sales sale WHERE sale.cash_session_id = session.id), 0) AS sale_count
        FROM cash_sessions session WHERE session.status = 'ABIERTA' ORDER BY session.opened_at DESC LIMIT 1`).first(),
      env.DB.prepare(`SELECT session.* FROM cash_sessions session ${admin ? "" : "WHERE session.opened_by_user_id = " + Number(user.id) + " OR session.closed_by_user_id = " + Number(user.id)} ORDER BY session.opened_at DESC LIMIT 30`).all(),
      env.DB.prepare(`SELECT item.*, COALESCE((SELECT SUM(returned.quantity) FROM sale_return_items returned WHERE returned.sale_item_id = item.id), 0) AS returned_quantity
        FROM sale_items item WHERE item.sale_id IN (SELECT id FROM sales ORDER BY created_at DESC LIMIT 100) ORDER BY item.sale_id, item.id`).all(),
      env.DB.prepare("SELECT payment.* FROM sale_payments payment WHERE payment.sale_id IN (SELECT id FROM sales ORDER BY created_at DESC LIMIT 100) ORDER BY payment.received_at").all(),
      env.DB.prepare(`SELECT ret.*, COALESCE((SELECT SUM(item.quantity) FROM sale_return_items item WHERE item.return_id = ret.id), 0) AS item_count
        FROM sale_returns ret WHERE ret.sale_id IN (SELECT id FROM sales ORDER BY created_at DESC LIMIT 100) ORDER BY ret.created_at DESC`).all(),
      admin ? env.DB.prepare(`SELECT 'HOY' AS period, COALESCE(SUM(CASE WHEN sale.status != 'ANULADA' THEN sale.total_cents - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0) ELSE 0 END), 0) AS net_sales_cents, COUNT(CASE WHEN sale.status != 'ANULADA' THEN 1 END) AS sale_count FROM sales sale WHERE date(sale.created_at) = date('now')
        UNION ALL SELECT 'SEMANA', COALESCE(SUM(CASE WHEN sale.status != 'ANULADA' THEN sale.total_cents - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0) ELSE 0 END), 0), COUNT(CASE WHEN sale.status != 'ANULADA' THEN 1 END) FROM sales sale WHERE date(sale.created_at) >= date('now', '-6 days')
        UNION ALL SELECT 'MES', COALESCE(SUM(CASE WHEN sale.status != 'ANULADA' THEN sale.total_cents - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0) ELSE 0 END), 0), COUNT(CASE WHEN sale.status != 'ANULADA' THEN 1 END) FROM sales sale WHERE strftime('%Y-%m', sale.created_at) = strftime('%Y-%m', 'now')`).all() : Promise.resolve({ results: [] }),
      admin ? env.DB.prepare(`SELECT item.product_id, item.product_name,
        SUM(item.quantity - COALESCE(returned.quantity, 0)) AS units,
        SUM(item.total_price_cents - COALESCE(returned.value_cents, 0)) AS revenue_cents,
        SUM((item.quantity - COALESCE(returned.quantity, 0)) * item.unit_cost_cents) AS cost_cents
        FROM sale_items item JOIN sales sale ON sale.id = item.sale_id
        LEFT JOIN (SELECT sale_item_id, SUM(quantity) AS quantity, SUM(total_price_cents) AS value_cents FROM sale_return_items GROUP BY sale_item_id) returned ON returned.sale_item_id = item.id
        WHERE sale.status != 'ANULADA' GROUP BY item.product_id, item.product_name ORDER BY units DESC LIMIT 10`).all() : Promise.resolve({ results: [] }),
      admin ? env.DB.prepare(`SELECT sale.created_by_name, COUNT(*) AS sale_count, COALESCE(SUM(sale.total_cents), 0) AS sales_cents FROM sales sale WHERE sale.status != 'ANULADA' GROUP BY sale.created_by_name ORDER BY sales_cents DESC LIMIT 10`).all() : Promise.resolve({ results: [] }),
      admin ? env.DB.prepare("SELECT payment_method, COUNT(*) AS payment_count, COALESCE(SUM(amount_cents), 0) AS amount_cents FROM sale_payments GROUP BY payment_method ORDER BY amount_cents DESC").all() : Promise.resolve({ results: [] }),
    ]);
    const safeProducts = products.results.map((product) => admin ? product : { ...product, average_cost_cents: null, main_stock: null });
    const safeMovements = movements.results.map((movement) => admin ? movement : { ...movement, total_cost_cents: null });
    return Response.json({ user: { id: user.id, name: user.name, role: user.role }, locations: locations.results, products: safeProducts, movements: safeMovements, expiring: expiring.results, activeStays: activeStays.results, occupants: occupants.results, recentSales: recentSales.results, pendingByStay: pendingByStay.results, pendingLimitCents: 20000, currentCashSession, cashSessions: cashSessions.results, saleItems: saleItems.results, payments: payments.results, returns: returns.results, reports: { periods: periodReports.results, products: productReports.results, workers: workerReports.results, paymentMethods: paymentReports.results } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentStoreUser(request);
    if (!user) return Response.json({ error: "Tu correo no tiene acceso activo." }, { status: 403 });
    await ensureLocations();
    const body = await request.json() as StorePayload;
    const now = new Date().toISOString();

    if (body.action === "cash_open") {
      const openingCashCents = nonNegativeInteger(body.openingCashCents);
      const notes = cleanText(body.notes, 300);
      if (openingCashCents < 0) return Response.json({ error: "Indica un monto inicial válido." }, { status: 400 });
      const existing = await env.DB.prepare("SELECT id, opened_by_name FROM cash_sessions WHERE status = 'ABIERTA' LIMIT 1").first<{ id: number; opened_by_name: string }>();
      if (existing) return Response.json({ error: `La caja ya está abierta por ${existing.opened_by_name}.` }, { status: 409 });
      const inserted = await env.DB.prepare("INSERT INTO cash_sessions (status, opened_by_user_id, opened_by_name, opened_at, opening_cash_cents, opening_notes) VALUES ('ABIERTA', ?, ?, ?, ?, ?)").bind(user.id, user.name, now, openingCashCents, notes).run();
      const sessionId = Number(inserted.meta.last_row_id);
      await env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, new_value, reason, created_at) VALUES (?, ?, ?, 'CAJA_ABIERTA', 'CASH_SESSION', ?, ?, ?, ?)").bind(user.id, user.name, user.role, sessionId, String(openingCashCents), notes || "Inicio de turno", now).run();
      return Response.json({ ok: true, sessionId });
    }

    if (body.action === "cash_close") {
      const countedCashCents = nonNegativeInteger(body.countedCashCents);
      const differenceReason = cleanText(body.differenceReason, 300);
      const notes = cleanText(body.notes, 300);
      if (countedCashCents < 0) return Response.json({ error: "Indica el efectivo contado al cierre." }, { status: 400 });
      const session = await env.DB.prepare("SELECT * FROM cash_sessions WHERE status = 'ABIERTA' ORDER BY opened_at DESC LIMIT 1").first<Record<string, unknown>>();
      if (!session) return Response.json({ error: "No existe una caja abierta." }, { status: 409 });
      const [income, refunds] = await Promise.all([
        env.DB.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM sale_payments WHERE cash_session_id = ? AND payment_method = 'EFECTIVO'").bind(session.id).first<{ total: number }>(),
        env.DB.prepare("SELECT COALESCE(SUM(refund_amount_cents), 0) AS total FROM sale_returns WHERE cash_session_id = ? AND refund_method = 'EFECTIVO'").bind(session.id).first<{ total: number }>(),
      ]);
      const expectedCashCents = Number(session.opening_cash_cents) + Number(income?.total || 0) - Number(refunds?.total || 0);
      const differenceCents = countedCashCents - expectedCashCents;
      if (differenceCents !== 0 && !differenceReason) return Response.json({ error: "Explica obligatoriamente la diferencia de caja." }, { status: 400 });
      const status = differenceCents === 0 ? "CERRADA" : "PENDIENTE_REVISION";
      await env.DB.batch([
        env.DB.prepare("UPDATE cash_sessions SET status = ?, closed_by_user_id = ?, closed_by_name = ?, closed_at = ?, expected_cash_cents = ?, counted_cash_cents = ?, difference_cents = ?, difference_reason = ?, closing_notes = ? WHERE id = ? AND status = 'ABIERTA'").bind(status, user.id, user.name, now, expectedCashCents, countedCashCents, differenceCents, differenceReason || null, notes || null, session.id),
        env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, old_value, new_value, reason, created_at) VALUES (?, ?, ?, 'CAJA_CERRADA', 'CASH_SESSION', ?, ?, ?, ?, ?)").bind(user.id, user.name, user.role, session.id, String(expectedCashCents), String(countedCashCents), differenceReason || notes || "Cierre conforme", now),
      ]);
      return Response.json({ ok: true, expectedCashCents, countedCashCents, differenceCents, status });
    }

    if (body.action === "cash_review") {
      if (!isAdministrator(user)) return Response.json({ error: "Solo Administración puede revisar diferencias de caja." }, { status: 403 });
      const sessionId = positiveInteger(body.sessionId);
      const reviewNote = cleanText(body.reviewNote, 300);
      if (!sessionId || !reviewNote) return Response.json({ error: "Indica la caja y la conclusión de la revisión." }, { status: 400 });
      const session = await env.DB.prepare("SELECT id FROM cash_sessions WHERE id = ? AND status = 'PENDIENTE_REVISION'").bind(sessionId).first();
      if (!session) return Response.json({ error: "La caja ya no tiene una diferencia pendiente." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE cash_sessions SET status = 'REVISADA', reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?, review_note = ? WHERE id = ?").bind(user.id, user.name, now, reviewNote, sessionId),
        env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, reason, created_at) VALUES (?, ?, ?, 'CAJA_REVISADA', 'CASH_SESSION', ?, ?, ?)").bind(user.id, user.name, user.role, sessionId, reviewNote, now),
      ]);
      return Response.json({ ok: true });
    }

    if (body.action === "sale_create") {
      const cashSession = await env.DB.prepare("SELECT id FROM cash_sessions WHERE status = 'ABIERTA' ORDER BY opened_at DESC LIMIT 1").first<{ id: number }>();
      if (!cashSession) return Response.json({ error: "Abre la caja de recepción antes de registrar ventas." }, { status: 409 });
      const rawItems = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
      const grouped = new Map<number, number>();
      rawItems.forEach((item) => { const productId = positiveInteger(item.productId); const quantity = positiveInteger(item.quantity); if (productId && quantity) grouped.set(productId, (grouped.get(productId) || 0) + quantity); });
      const items: SaleItemInput[] = Array.from(grouped, ([productId, quantity]) => ({ productId, quantity }));
      if (!items.length || items.length > 50 || items.some((item) => item.quantity > 1000)) return Response.json({ error: "Agrega al menos un producto y revisa las cantidades." }, { status: 400 });
      const saleType = body.saleType === "DIRECTA" ? "DIRECTA" : "HUESPED";
      const paymentMethods = ["EFECTIVO", "TRANSFERENCIA", "QR", "PENDIENTE", "CORTESIA", "OTRO"];
      const paymentMethod = cleanText(body.paymentMethod, 20).toUpperCase();
      if (!paymentMethods.includes(paymentMethod)) return Response.json({ error: "Selecciona una forma de pago válida." }, { status: 400 });
      if (paymentMethod === "CORTESIA" && !isAdministrator(user)) return Response.json({ error: "La cortesía requiere autorización de Administración." }, { status: 403 });
      if (saleType === "DIRECTA" && paymentMethod === "PENDIENTE") return Response.json({ error: "Una venta directa no puede quedar pendiente a una habitación." }, { status: 400 });
      const stayId = saleType === "HUESPED" ? positiveInteger(body.stayId) : 0;
      const consumerGuestId = positiveInteger(body.consumerGuestId) || null;
      const customerName = cleanText(body.customerName, 100) || null;
      let stay: { id: number; room_id: number; primary_guest_id: number; room_number: string } | null = null;
      if (saleType === "HUESPED") {
        stay = await env.DB.prepare("SELECT stay.id, stay.room_id, stay.primary_guest_id, room.number AS room_number FROM stays stay JOIN rooms room ON room.id = stay.room_id WHERE stay.id = ? AND stay.status = 'ACTIVA'").bind(stayId).first<{ id: number; room_id: number; primary_guest_id: number; room_number: string }>();
        if (!stay) return Response.json({ error: "Selecciona una estadía activa." }, { status: 409 });
        if (consumerGuestId) {
          const occupant = await env.DB.prepare("SELECT id FROM stay_guests WHERE stay_id = ? AND guest_id = ? AND left_at IS NULL LIMIT 1").bind(stayId, consumerGuestId).first();
          if (!occupant) return Response.json({ error: "El consumidor seleccionado no pertenece a esta estadía." }, { status: 400 });
        }
      }
      const placeholders = items.map(() => "?").join(",");
      const products = await env.DB.prepare(`SELECT id, sku, name, sale_price_cents, average_cost_cents FROM commercial_products WHERE active = 1 AND id IN (${placeholders})`).bind(...items.map((item) => item.productId)).all<{ id: number; sku: string; name: string; sale_price_cents: number; average_cost_cents: number }>();
      if (products.results.length !== items.length) return Response.json({ error: "Uno de los productos ya no está disponible." }, { status: 409 });
      const reception = await env.DB.prepare("SELECT id FROM stock_locations WHERE code = 'RECEPTION' AND active = 1").first<{ id: number }>();
      if (!reception) return Response.json({ error: "El stock de recepción no está configurado." }, { status: 409 });
      const productMap = new Map(products.results.map((product) => [product.id, product]));
      const allocations: Array<{ productId: number; batchId: number; quantity: number; unitCostCents: number }> = [];
      const itemRows: Array<{ product: typeof products.results[number]; quantity: number; totalPriceCents: number; totalCostCents: number }> = [];
      let totalCents = 0;
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const batches = await env.DB.prepare("SELECT id, quantity, unit_cost_cents, expires_on FROM stock_batches WHERE product_id = ? AND location_id = ? AND quantity > 0 AND (expires_on IS NULL OR date(expires_on) >= date('now')) ORDER BY CASE WHEN expires_on IS NULL THEN 1 ELSE 0 END, expires_on, received_at, id")
          .bind(item.productId, reception.id).all<StockBatch>();
        const available = batches.results.reduce((sum, batch) => sum + batch.quantity, 0);
        if (available < item.quantity) return Response.json({ error: `${product.name}: recepción dispone de ${available} unidad(es).` }, { status: 409 });
        let remaining = item.quantity;
        let totalCostCents = 0;
        for (const batch of batches.results) {
          if (!remaining) break;
          const quantity = Math.min(batch.quantity, remaining);
          remaining -= quantity;
          totalCostCents += quantity * batch.unit_cost_cents;
          allocations.push({ productId: item.productId, batchId: batch.id, quantity, unitCostCents: batch.unit_cost_cents });
        }
        const totalPriceCents = item.quantity * product.sale_price_cents;
        totalCents += totalPriceCents;
        itemRows.push({ product, quantity: item.quantity, totalPriceCents, totalCostCents });
      }
      const currentPending = stayId ? await env.DB.prepare(`SELECT COALESCE(SUM(MAX(0, sale.total_cents - COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0))), 0) AS total FROM sales sale WHERE sale.stay_id = ? AND sale.status = 'PENDIENTE'`).bind(stayId).first<{ total: number }>() : null;
      const pendingLimitCents = 20000;
      if (paymentMethod === "PENDIENTE" && (currentPending?.total || 0) + totalCents > pendingLimitCents && (!isAdministrator(user) || body.pendingOverride !== true)) {
        return Response.json({ error: `El saldo pendiente superaría ${money(pendingLimitCents)}. Requiere autorización administrativa.` }, { status: 403 });
      }
      const year = new Date(now).getUTCFullYear();
      const sequenceRow = await env.DB.prepare("INSERT INTO commercial_sequences (year, next_value) VALUES (?, 1) ON CONFLICT(year) DO UPDATE SET next_value = next_value + 1 RETURNING next_value").bind(year).first<{ next_value: number }>();
      if (!sequenceRow) return Response.json({ error: "No se pudo asignar el número de venta." }, { status: 500 });
      const sequence = sequenceRow.next_value;
      const saleNumber = `V-${year}-${String(sequence).padStart(6, "0")}`;
      const status = paymentMethod === "PENDIENTE" ? "PENDIENTE" : "PAGADA";
      const statements = [env.DB.prepare(`INSERT INTO sales (sale_number, sale_year, sequence, sale_type, stay_id, room_id, consumer_guest_id, customer_name, status, payment_method, cash_session_id, subtotal_cents, total_cents, notes, print_count, created_by_user_id, created_by_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`).bind(saleNumber, year, sequence, saleType, stay?.id || null, stay?.room_id || null, consumerGuestId || (stay?.primary_guest_id ?? null), customerName, status, paymentMethod, cashSession.id, totalCents, totalCents, cleanText(body.notes, 500), user.id, user.name, now)];
      if (paymentMethod !== "PENDIENTE") statements.push(env.DB.prepare("INSERT INTO sale_payments (sale_id, cash_session_id, payment_method, amount_cents, reference, received_by_user_id, received_by_name, received_at) VALUES ((SELECT id FROM sales WHERE sale_number = ?), ?, ?, ?, ?, ?, ?, ?)")
        .bind(saleNumber, cashSession.id, paymentMethod, totalCents, cleanText(body.paymentReference, 150), user.id, user.name, now));
      itemRows.forEach((item) => {
        const unitCost = item.quantity ? Math.round(item.totalCostCents / item.quantity) : item.product.average_cost_cents;
        statements.push(env.DB.prepare(`INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price_cents, unit_cost_cents, total_price_cents, total_cost_cents)
          VALUES ((SELECT id FROM sales WHERE sale_number = ?), ?, ?, ?, ?, ?, ?, ?, ?)`).bind(saleNumber, item.product.id, item.product.name, item.product.sku, item.quantity, item.product.sale_price_cents, unitCost, item.totalPriceCents, item.totalCostCents));
        statements.push(env.DB.prepare("INSERT INTO stock_movements (product_id, from_location_id, to_location_id, movement_type, quantity, total_cost_cents, reason, responsible, created_by, created_at) VALUES (?, ?, NULL, 'VENTA', ?, ?, ?, ?, ?, ?)")
          .bind(item.product.id, reception.id, item.quantity, item.totalCostCents, saleNumber, user.name, user.name, now));
      });
      allocations.forEach((allocation) => {
        statements.push(env.DB.prepare("UPDATE stock_batches SET quantity = quantity - ? WHERE id = ? AND quantity >= ?").bind(allocation.quantity, allocation.batchId, allocation.quantity));
        statements.push(env.DB.prepare("INSERT INTO sale_stock_allocations (sale_id, product_id, batch_id, quantity, unit_cost_cents) VALUES ((SELECT id FROM sales WHERE sale_number = ?), ?, ?, ?, ?)")
          .bind(saleNumber, allocation.productId, allocation.batchId, allocation.quantity, allocation.unitCostCents));
      });
      statements.push(env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, room_id, new_value, reason, created_at) VALUES (?, ?, ?, 'VENTA_REGISTRADA', 'SALE', (SELECT id FROM sales WHERE sale_number = ?), ?, ?, ?, ?)")
        .bind(user.id, user.name, user.role, saleNumber, stay?.room_id || null, JSON.stringify({ saleNumber, status, paymentMethod, totalCents }), saleType === "HUESPED" ? `Venta vinculada a estadía ${stayId}` : "Venta directa", now));
      await env.DB.batch(statements);
      return Response.json({ ok: true, saleNumber, status, totalCents, receiptUrl: `/api/store?receipt=${encodeURIComponent(saleNumber)}` });
    }

    if (body.action === "sale_payment") {
      const saleId = positiveInteger(body.saleId);
      const amountCents = positiveInteger(body.amountCents);
      const paymentMethod = cleanText(body.paymentMethod, 20).toUpperCase();
      const reference = cleanText(body.reference, 150);
      if (!saleId || !amountCents || !["EFECTIVO", "TRANSFERENCIA", "QR", "CORTESIA", "OTRO"].includes(paymentMethod)) return Response.json({ error: "Completa venta, monto y forma de cobro." }, { status: 400 });
      if (paymentMethod === "CORTESIA" && !isAdministrator(user)) return Response.json({ error: "La cortesía requiere autorización de Administración." }, { status: 403 });
      const cashSession = await env.DB.prepare("SELECT id FROM cash_sessions WHERE status = 'ABIERTA' ORDER BY opened_at DESC LIMIT 1").first<{ id: number }>();
      if (!cashSession) return Response.json({ error: "Abre la caja antes de registrar cobros." }, { status: 409 });
      const sale = await env.DB.prepare(`SELECT sale.id, sale.sale_number, sale.status, sale.room_id, sale.total_cents,
        COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) AS paid_cents,
        COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0) AS returned_cents
        FROM sales sale WHERE sale.id = ?`).bind(saleId).first<{ id: number; sale_number: string; status: string; room_id: number | null; total_cents: number; paid_cents: number; returned_cents: number }>();
      if (!sale || ["ANULADA", "DEVUELTA"].includes(sale.status)) return Response.json({ error: "La venta no admite nuevos cobros." }, { status: 409 });
      const balanceCents = Math.max(0, sale.total_cents - sale.paid_cents - sale.returned_cents);
      if (amountCents > balanceCents) return Response.json({ error: `El saldo máximo a cobrar es ${money(balanceCents)}.` }, { status: 409 });
      const nextStatus = amountCents === balanceCents ? "PAGADA" : "PENDIENTE";
      await env.DB.batch([
        env.DB.prepare("INSERT INTO sale_payments (sale_id, cash_session_id, payment_method, amount_cents, reference, received_by_user_id, received_by_name, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(saleId, cashSession.id, paymentMethod, amountCents, reference, user.id, user.name, now),
        env.DB.prepare("UPDATE sales SET status = ? WHERE id = ?").bind(nextStatus, saleId),
        env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, room_id, new_value, reason, created_at) VALUES (?, ?, ?, 'PAGO_REGISTRADO', 'SALE', ?, ?, ?, ?, ?)").bind(user.id, user.name, user.role, saleId, sale.room_id, JSON.stringify({ amountCents, paymentMethod, nextStatus }), reference || `Cobro de ${sale.sale_number}`, now),
      ]);
      return Response.json({ ok: true, status: nextStatus, balanceCents: balanceCents - amountCents });
    }

    if (body.action === "sale_return") {
      const saleId = positiveInteger(body.saleId);
      const reason = cleanText(body.reason, 300);
      const responsible = cleanText(body.responsible, 100);
      const physicalCondition = cleanText(body.physicalCondition, 20).toUpperCase();
      const returnsToStock = body.returnsToStock === true;
      const refundMethod = cleanText(body.refundMethod, 20).toUpperCase();
      const requestedItems = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
      if (!saleId || !reason || !responsible || !["SELLADO", "BUENO", "ABIERTO", "DANADO"].includes(physicalCondition) || !["EFECTIVO", "TRANSFERENCIA", "QR", "SALDO", "SIN_REEMBOLSO", "OTRO"].includes(refundMethod)) return Response.json({ error: "Completa motivo, responsable, estado físico y forma de devolución." }, { status: 400 });
      if (returnsToStock && !["SELLADO", "BUENO"].includes(physicalCondition)) return Response.json({ error: "Un producto abierto o dañado no puede volver al stock vendible." }, { status: 400 });
      const cashSession = await env.DB.prepare("SELECT id FROM cash_sessions WHERE status = 'ABIERTA' ORDER BY opened_at DESC LIMIT 1").first<{ id: number }>();
      if (!cashSession) return Response.json({ error: "Abre la caja antes de registrar devoluciones." }, { status: 409 });
      const sale = await env.DB.prepare(`SELECT sale.id, sale.sale_number, sale.status, sale.room_id, sale.total_cents,
        COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) AS paid_cents,
        COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0) AS returned_cents
        FROM sales sale WHERE sale.id = ?`).bind(saleId).first<{ id: number; sale_number: string; status: string; room_id: number | null; total_cents: number; paid_cents: number; returned_cents: number }>();
      if (!sale || ["ANULADA", "DEVUELTA"].includes(sale.status)) return Response.json({ error: "La venta no admite devoluciones." }, { status: 409 });
      const returnRows: Array<{ id: number; product_id: number; product_name: string; quantity: number; unit_price_cents: number; unit_cost_cents: number; returned_quantity: number; returnQuantity: number }> = [];
      for (const requested of requestedItems) {
        const saleItemId = positiveInteger(requested.saleItemId);
        const returnQuantity = positiveInteger(requested.quantity);
        if (!saleItemId || !returnQuantity) continue;
        const item = await env.DB.prepare(`SELECT item.id, item.product_id, item.product_name, item.quantity, item.unit_price_cents, item.unit_cost_cents,
          COALESCE((SELECT SUM(returned.quantity) FROM sale_return_items returned WHERE returned.sale_item_id = item.id), 0) AS returned_quantity
          FROM sale_items item WHERE item.id = ? AND item.sale_id = ?`).bind(saleItemId, saleId).first<{ id: number; product_id: number; product_name: string; quantity: number; unit_price_cents: number; unit_cost_cents: number; returned_quantity: number }>();
        if (!item || returnQuantity > item.quantity - item.returned_quantity) return Response.json({ error: "Una cantidad devuelta supera lo disponible en la venta." }, { status: 409 });
        returnRows.push({ ...item, returnQuantity });
      }
      if (!returnRows.length) return Response.json({ error: "Selecciona al menos un producto y cantidad para devolver." }, { status: 400 });
      const selectedValueCents = returnRows.reduce((sum, item) => sum + item.returnQuantity * item.unit_price_cents, 0);
      const refundAmountCents = refundMethod === "SIN_REEMBOLSO" ? 0 : selectedValueCents;
      if (refundMethod === "EFECTIVO" && refundAmountCents > sale.paid_cents) return Response.json({ error: "El reembolso en efectivo supera lo cobrado previamente." }, { status: 409 });
      const inserted = await env.DB.prepare("INSERT INTO sale_returns (sale_id, reason, responsible, physical_condition, returns_to_stock, refund_method, refund_amount_cents, cash_session_id, created_by_user_id, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(saleId, reason, responsible, physicalCondition, returnsToStock ? 1 : 0, refundMethod, refundAmountCents, cashSession.id, user.id, user.name, now).run();
      const returnId = Number(inserted.meta.last_row_id);
      const returnNumber = `D-${sale.sale_number.slice(2)}-${String(returnId).padStart(3, "0")}`;
      const reception = returnsToStock ? await env.DB.prepare("SELECT id FROM stock_locations WHERE code = 'RECEPTION' AND active = 1").first<{ id: number }>() : null;
      if (returnsToStock && !reception) return Response.json({ error: "El stock de recepción no está disponible." }, { status: 409 });
      const statements = [env.DB.prepare("UPDATE sale_returns SET return_number = ? WHERE id = ?").bind(returnNumber, returnId)];
      returnRows.forEach((item) => {
        const totalPriceCents = item.returnQuantity * item.unit_price_cents;
        statements.push(env.DB.prepare("INSERT INTO sale_return_items (return_id, sale_item_id, product_id, product_name, quantity, unit_price_cents, unit_cost_cents, total_price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(returnId, item.id, item.product_id, item.product_name, item.returnQuantity, item.unit_price_cents, item.unit_cost_cents, totalPriceCents));
        if (returnsToStock && reception) {
          statements.push(env.DB.prepare("INSERT INTO stock_batches (product_id, location_id, quantity, unit_cost_cents, expires_on, received_at, created_by) VALUES (?, ?, ?, ?, NULL, ?, ?)").bind(item.product_id, reception.id, item.returnQuantity, item.unit_cost_cents, now, user.name));
          statements.push(env.DB.prepare("INSERT INTO stock_movements (product_id, from_location_id, to_location_id, movement_type, quantity, total_cost_cents, reason, responsible, created_by, created_at) VALUES (?, NULL, ?, 'DEVOLUCION', ?, ?, ?, ?, ?, ?)").bind(item.product_id, reception.id, item.returnQuantity, item.returnQuantity * item.unit_cost_cents, `${returnNumber}: ${reason}`, responsible, user.name, now));
        }
      });
      const allItems = await env.DB.prepare(`SELECT item.id, item.quantity, COALESCE((SELECT SUM(returned.quantity) FROM sale_return_items returned WHERE returned.sale_item_id = item.id), 0) AS returned_quantity FROM sale_items item WHERE item.sale_id = ?`).bind(saleId).all<{ id: number; quantity: number; returned_quantity: number }>();
      const newlyReturned = new Map(returnRows.map((item) => [item.id, item.returnQuantity]));
      const fullyReturned = allItems.results.every((item) => item.returned_quantity + (newlyReturned.get(item.id) || 0) >= item.quantity);
      const remainingBalance = Math.max(0, sale.total_cents - sale.paid_cents - sale.returned_cents - refundAmountCents);
      const nextStatus = fullyReturned ? "DEVUELTA" : remainingBalance > 0 ? "PENDIENTE" : "PAGADA";
      statements.push(env.DB.prepare("UPDATE sales SET status = ? WHERE id = ?").bind(nextStatus, saleId));
      statements.push(env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, room_id, new_value, reason, created_at) VALUES (?, ?, ?, 'DEVOLUCION_REGISTRADA', 'SALE', ?, ?, ?, ?, ?)").bind(user.id, user.name, user.role, saleId, sale.room_id, JSON.stringify({ returnNumber, refundAmountCents, refundMethod, returnsToStock, nextStatus }), reason, now));
      await env.DB.batch(statements);
      return Response.json({ ok: true, returnNumber, refundAmountCents, status: nextStatus, stockRestored: returnsToStock });
    }

    if (body.action === "sale_cancel") {
      const saleId = positiveInteger(body.saleId);
      const reason = cleanText(body.reason, 300);
      if (!saleId || !reason) return Response.json({ error: "Indica la venta y el motivo obligatorio de anulación." }, { status: 400 });
      const sale = await env.DB.prepare("SELECT id, sale_number, status, room_id FROM sales WHERE id = ?").bind(saleId).first<{ id: number; sale_number: string; status: string; room_id: number | null }>();
      if (!sale) return Response.json({ error: "La venta no existe." }, { status: 404 });
      if (sale.status === "ANULADA") return Response.json({ error: "La venta ya está anulada." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE sales SET status = 'ANULADA', cancelled_by_user_id = ?, cancelled_by_name = ?, cancelled_at = ?, cancellation_reason = ? WHERE id = ? AND status != 'ANULADA'").bind(user.id, user.name, now, reason, saleId),
        env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, room_id, old_value, new_value, reason, created_at) VALUES (?, ?, ?, 'VENTA_ANULADA', 'SALE', ?, ?, ?, 'ANULADA', ?, ?)").bind(user.id, user.name, user.role, saleId, sale.room_id, sale.status, reason, now),
      ]);
      return Response.json({ ok: true, stockRestored: false });
    }

    if (!isAdministrator(user)) return Response.json({ error: "Solo Administración puede modificar catálogo o existencias." }, { status: 403 });

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
