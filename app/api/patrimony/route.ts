import { env } from "@/lib/runtime-env";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "PROPIETARIO" | "ADMINISTRADOR";
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS patrimony_properties (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, property_type TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', unit_count INTEGER NOT NULL DEFAULT 0, monthly_potential_cents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'PRODUCTIVA', notes TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_by_user_id INTEGER NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS patrimony_tenants (id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, unit_name TEXT NOT NULL, full_name TEXT NOT NULL, ci TEXT, phone TEXT, monthly_rent_cents INTEGER NOT NULL DEFAULT 0, payment_day INTEGER NOT NULL, contract_start TEXT, contract_end TEXT, status TEXT NOT NULL DEFAULT 'ACTIVO', notes TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_by_user_id INTEGER NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS patrimony_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, tenant_id INTEGER, paid_on TEXT NOT NULL, concept TEXT NOT NULL, amount_cents INTEGER NOT NULL, payment_method TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'CONCILIADO', reference TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_by_user_id INTEGER NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS patrimony_expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL, incurred_on TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, amount_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDIENTE', evidence_note TEXT NOT NULL, created_by_user_id INTEGER NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT NOT NULL, reviewed_by_user_id INTEGER, reviewed_by_name TEXT, reviewed_at TEXT, review_note TEXT)`,
  `CREATE TABLE IF NOT EXISTS patrimony_distribution (code TEXT PRIMARY KEY, label TEXT NOT NULL, percentage INTEGER NOT NULL, position INTEGER NOT NULL, updated_by_user_id INTEGER, updated_by_name TEXT, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_patrimony_properties_status ON patrimony_properties(active, status)`,
  `CREATE INDEX IF NOT EXISTS idx_patrimony_tenants_property_active ON patrimony_tenants(property_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_patrimony_payments_property_date ON patrimony_payments(property_id, paid_on)`,
  `CREATE INDEX IF NOT EXISTS idx_patrimony_payments_tenant_date ON patrimony_payments(tenant_id, paid_on)`,
  `CREATE INDEX IF NOT EXISTS idx_patrimony_expenses_property_date ON patrimony_expenses(property_id, incurred_on)`,
  `CREATE INDEX IF NOT EXISTS idx_patrimony_expenses_status_date ON patrimony_expenses(status, incurred_on)`,
];

async function ensureSchema() {
  await env.DB.batch(schemaStatements.map((statement) => env.DB.prepare(statement)));
  const now = new Date().toISOString();
  const defaults = [
    ["FAMILIAR_1", "Familiar 1", 15, 1],
    ["FAMILIAR_2", "Familiar 2", 15, 2],
    ["FAMILIAR_3", "Familiar 3", 20, 3],
    ["FAMILIAR_4", "Familiar 4", 15, 4],
    ["FAMILIAR_5", "Familiar 5", 35, 5],
  ] as const;
  await env.DB.batch(defaults.map(([code, label, percentage, position]) => env.DB.prepare(
    "INSERT OR IGNORE INTO patrimony_distribution (code, label, percentage, position, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(code, label, percentage, position, now)));
}

async function currentAdmin(request: Request): Promise<AdminUser | null> {
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const externalId = request.headers.get("oai-authenticated-user-id") || (isLocal ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || (isLocal ? "propietario@hotelasael.local" : "");
  if (!externalId || !email) return null;
  return env.DB.prepare(`SELECT id, name, email, role FROM users WHERE (external_id = ? OR lower(email) = lower(?)) AND active = 1 AND role IN ('PROPIETARIO', 'ADMINISTRADOR') LIMIT 1`)
    .bind(externalId, email).first<AdminUser>();
}

function cleanText(value: unknown, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function integer(value: unknown, field: string, allowZero = false) {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) throw new Error(`VALIDATION:${field}`);
  return parsed;
}

async function audit(user: AdminUser, action: string, entityType: string, entityId: number | null, detail: string, now: string) {
  await env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(user.id, user.name, user.role, action, entityType, entityId, detail, now).run();
}

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message.startsWith("VALIDATION:")) return Response.json({ error: error.message.slice(11) }, { status: 400 });
  console.error("Patrimony API error", error);
  return Response.json({ error: "No se pudo completar la operación patrimonial." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const user = await currentAdmin(request);
    if (!user) return Response.json({ error: "Patrimonio Base está disponible únicamente para Administración." }, { status: 403 });
    const [properties, tenants, payments, expenses, distribution] = await Promise.all([
      env.DB.prepare(`SELECT property.*, COALESCE((SELECT COUNT(*) FROM patrimony_tenants tenant WHERE tenant.property_id = property.id AND tenant.active = 1), 0) AS tenant_count, COALESCE((SELECT SUM(payment.amount_cents) FROM patrimony_payments payment WHERE payment.property_id = property.id AND payment.status != 'ANULADO'), 0) AS collected_cents, COALESCE((SELECT SUM(expense.amount_cents) FROM patrimony_expenses expense WHERE expense.property_id = property.id AND expense.status = 'APROBADO'), 0) AS approved_expense_cents FROM patrimony_properties property WHERE property.active = 1 ORDER BY property.name`).all(),
      env.DB.prepare(`SELECT tenant.*, property.name AS property_name FROM patrimony_tenants tenant JOIN patrimony_properties property ON property.id = tenant.property_id WHERE tenant.active = 1 ORDER BY CASE tenant.status WHEN 'VENCIDO' THEN 0 WHEN 'PENDIENTE' THEN 1 ELSE 2 END, tenant.full_name`).all(),
      env.DB.prepare(`SELECT payment.*, property.name AS property_name, tenant.full_name AS tenant_name, tenant.unit_name FROM patrimony_payments payment JOIN patrimony_properties property ON property.id = payment.property_id LEFT JOIN patrimony_tenants tenant ON tenant.id = payment.tenant_id ORDER BY payment.paid_on DESC, payment.created_at DESC LIMIT 300`).all(),
      env.DB.prepare(`SELECT expense.*, property.name AS property_name FROM patrimony_expenses expense JOIN patrimony_properties property ON property.id = expense.property_id ORDER BY CASE expense.status WHEN 'PENDIENTE' THEN 0 ELSE 1 END, expense.incurred_on DESC, expense.created_at DESC LIMIT 300`).all(),
      env.DB.prepare("SELECT * FROM patrimony_distribution ORDER BY position").all(),
    ]);
    return Response.json({ user, properties: properties.results, tenants: tenants.results, payments: payments.results, expenses: expenses.results, distribution: distribution.results });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const user = await currentAdmin(request);
    if (!user) return Response.json({ error: "Patrimonio Base está disponible únicamente para Administración." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const action = cleanText(body.action, 60);
    const now = new Date().toISOString();

    if (action === "property_save") {
      const id = Math.trunc(Number(body.id || 0));
      const name = cleanText(body.name, 150);
      const propertyType = cleanText(body.propertyType, 80);
      const status = cleanText(body.status, 30);
      if (!name || !propertyType) throw new Error("VALIDATION:Indica el nombre y tipo de propiedad.");
      if (!["PRODUCTIVA", "VACANTE", "LITIGIO", "DISPUTA", "OPORTUNIDAD", "INACTIVA"].includes(status)) throw new Error("VALIDATION:Selecciona un estado válido.");
      const unitCount = integer(body.unitCount, "Indica una cantidad de unidades válida.", true);
      const potential = integer(body.monthlyPotentialCents, "Indica un ingreso potencial válido.", true);
      let entityId = id;
      if (id) {
        await env.DB.prepare("UPDATE patrimony_properties SET name = ?, property_type = ?, address = ?, unit_count = ?, monthly_potential_cents = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?")
          .bind(name, propertyType, cleanText(body.address, 220), unitCount, potential, status, cleanText(body.notes, 800), now, id).run();
      } else {
        const result = await env.DB.prepare("INSERT INTO patrimony_properties (name, property_type, address, unit_count, monthly_potential_cents, status, notes, created_by_user_id, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(name, propertyType, cleanText(body.address, 220), unitCount, potential, status, cleanText(body.notes, 800), user.id, user.name, now).run();
        entityId = Number(result.meta.last_row_id);
      }
      await audit(user, id ? "PROPIEDAD_ACTUALIZADA" : "PROPIEDAD_REGISTRADA", "PATRIMONY_PROPERTY", entityId, name, now);
      return Response.json({ ok: true, id: entityId });
    }

    if (action === "tenant_save") {
      const id = Math.trunc(Number(body.id || 0));
      const propertyId = integer(body.propertyId, "Selecciona una propiedad.");
      const property = await env.DB.prepare("SELECT id FROM patrimony_properties WHERE id = ? AND active = 1").bind(propertyId).first();
      if (!property) throw new Error("VALIDATION:La propiedad seleccionada no está activa.");
      const fullName = cleanText(body.fullName, 160);
      const unitName = cleanText(body.unitName, 80);
      const status = cleanText(body.status, 30);
      if (!fullName || !unitName) throw new Error("VALIDATION:Indica el inquilino y la unidad asignada.");
      if (!["ACTIVO", "PENDIENTE", "VENCIDO", "FINALIZADO"].includes(status)) throw new Error("VALIDATION:Selecciona un estado válido.");
      const paymentDay = integer(body.paymentDay, "Indica un día de pago válido.");
      if (paymentDay > 31) throw new Error("VALIDATION:El día de pago debe estar entre 1 y 31.");
      const rent = integer(body.monthlyRentCents, "Indica un canon mensual válido.", true);
      let entityId = id;
      if (id) {
        await env.DB.prepare("UPDATE patrimony_tenants SET property_id = ?, unit_name = ?, full_name = ?, ci = ?, phone = ?, monthly_rent_cents = ?, payment_day = ?, contract_start = ?, contract_end = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?")
          .bind(propertyId, unitName, fullName, cleanText(body.ci, 40) || null, cleanText(body.phone, 50) || null, rent, paymentDay, cleanText(body.contractStart, 20) || null, cleanText(body.contractEnd, 20) || null, status, cleanText(body.notes, 800), now, id).run();
      } else {
        const result = await env.DB.prepare("INSERT INTO patrimony_tenants (property_id, unit_name, full_name, ci, phone, monthly_rent_cents, payment_day, contract_start, contract_end, status, notes, created_by_user_id, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(propertyId, unitName, fullName, cleanText(body.ci, 40) || null, cleanText(body.phone, 50) || null, rent, paymentDay, cleanText(body.contractStart, 20) || null, cleanText(body.contractEnd, 20) || null, status, cleanText(body.notes, 800), user.id, user.name, now).run();
        entityId = Number(result.meta.last_row_id);
      }
      await audit(user, id ? "INQUILINO_ACTUALIZADO" : "INQUILINO_REGISTRADO", "PATRIMONY_TENANT", entityId, fullName + " · " + unitName, now);
      return Response.json({ ok: true, id: entityId });
    }

    if (action === "payment_create") {
      const propertyId = integer(body.propertyId, "Selecciona una propiedad.");
      const tenantId = Math.trunc(Number(body.tenantId || 0));
      const property = await env.DB.prepare("SELECT id FROM patrimony_properties WHERE id = ? AND active = 1").bind(propertyId).first();
      if (!property) throw new Error("VALIDATION:La propiedad seleccionada no está activa.");
      if (tenantId) {
        const tenant = await env.DB.prepare("SELECT id FROM patrimony_tenants WHERE id = ? AND property_id = ? AND active = 1").bind(tenantId, propertyId).first();
        if (!tenant) throw new Error("VALIDATION:El inquilino no corresponde a la propiedad seleccionada.");
      }
      const amount = integer(body.amountCents, "Indica un monto válido.");
      const paymentMethod = cleanText(body.paymentMethod, 30);
      const status = cleanText(body.status, 30);
      const concept = cleanText(body.concept, 160);
      if (!concept) throw new Error("VALIDATION:Indica el concepto del cobro.");
      if (!["EFECTIVO", "TRANSFERENCIA", "QR", "OTRO"].includes(paymentMethod)) throw new Error("VALIDATION:Selecciona una forma de pago válida.");
      if (!["CONCILIADO", "VERIFICADO", "PENDIENTE"].includes(status)) throw new Error("VALIDATION:Selecciona un estado válido.");
      const result = await env.DB.prepare("INSERT INTO patrimony_payments (property_id, tenant_id, paid_on, concept, amount_cents, payment_method, status, reference, notes, created_by_user_id, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(propertyId, tenantId || null, cleanText(body.paidOn, 20) || now.slice(0, 10), concept, amount, paymentMethod, status, cleanText(body.reference, 160), cleanText(body.notes, 800), user.id, user.name, now).run();
      const entityId = Number(result.meta.last_row_id);
      await audit(user, "COBRO_PATRIMONIAL_REGISTRADO", "PATRIMONY_PAYMENT", entityId, concept + " · " + amount + " centavos", now);
      return Response.json({ ok: true, id: entityId });
    }

    if (action === "expense_create") {
      const propertyId = integer(body.propertyId, "Selecciona una propiedad.");
      const property = await env.DB.prepare("SELECT id FROM patrimony_properties WHERE id = ? AND active = 1").bind(propertyId).first();
      if (!property) throw new Error("VALIDATION:La propiedad seleccionada no está activa.");
      const amount = integer(body.amountCents, "Indica un monto válido.");
      const category = cleanText(body.category, 80);
      const description = cleanText(body.description, 500);
      const evidenceNote = cleanText(body.evidenceNote, 500);
      if (!category || !description) throw new Error("VALIDATION:Indica categoría y descripción del gasto.");
      if (!evidenceNote) throw new Error("VALIDATION:Todo gasto requiere una referencia de evidencia o comprobante.");
      const result = await env.DB.prepare("INSERT INTO patrimony_expenses (property_id, incurred_on, category, description, amount_cents, status, evidence_note, created_by_user_id, created_by_name, created_at) VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?)")
        .bind(propertyId, cleanText(body.incurredOn, 20) || now.slice(0, 10), category, description, amount, evidenceNote, user.id, user.name, now).run();
      const entityId = Number(result.meta.last_row_id);
      await audit(user, "GASTO_PATRIMONIAL_REGISTRADO", "PATRIMONY_EXPENSE", entityId, category + " · pendiente de revisión", now);
      return Response.json({ ok: true, id: entityId });
    }

    if (action === "expense_review") {
      const expenseId = integer(body.expenseId, "Selecciona un gasto.");
      const decision = cleanText(body.decision, 30);
      const reviewNote = cleanText(body.reviewNote, 500);
      if (!["APROBADO", "RECHAZADO"].includes(decision) || !reviewNote) throw new Error("VALIDATION:Indica una decisión y la nota administrativa.");
      const expense = await env.DB.prepare("SELECT id FROM patrimony_expenses WHERE id = ? AND status = 'PENDIENTE'").bind(expenseId).first();
      if (!expense) throw new Error("VALIDATION:El gasto ya fue revisado o no existe.");
      await env.DB.prepare("UPDATE patrimony_expenses SET status = ?, reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?, review_note = ? WHERE id = ?")
        .bind(decision, user.id, user.name, now, reviewNote, expenseId).run();
      await audit(user, "GASTO_" + decision, "PATRIMONY_EXPENSE", expenseId, reviewNote, now);
      return Response.json({ ok: true });
    }

    if (action === "distribution_save") {
      const rows = Array.isArray(body.rows) ? body.rows as Array<Record<string, unknown>> : [];
      const normalized = rows.map((row) => ({ code: cleanText(row.code, 40), percentage: integer(row.percentage, "Cada porcentaje debe ser válido.", true) }));
      if (!normalized.length || normalized.reduce((sum, row) => sum + row.percentage, 0) !== 100) throw new Error("VALIDATION:La distribución debe sumar exactamente 100%.");
      const configured = await env.DB.prepare("SELECT code FROM patrimony_distribution ORDER BY position").all<{ code: string }>();
      const knownCodes = new Set(configured.results.map((row) => row.code));
      if (normalized.some((row) => !knownCodes.has(row.code))) throw new Error("VALIDATION:La distribución contiene una categoría no reconocida.");
      await env.DB.batch(normalized.map((row) => env.DB.prepare("UPDATE patrimony_distribution SET percentage = ?, updated_by_user_id = ?, updated_by_name = ?, updated_at = ? WHERE code = ?").bind(row.percentage, user.id, user.name, now, row.code)));
      await audit(user, "DISTRIBUCION_PATRIMONIAL_ACTUALIZADA", "PATRIMONY_DISTRIBUTION", null, normalized.map((row) => row.code + ":" + row.percentage + "%").join(", "), now);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Acción patrimonial no reconocida." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
