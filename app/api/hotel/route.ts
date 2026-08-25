import { env } from "cloudflare:workers";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, external_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, invited_by TEXT, activated_at TEXT, last_access_at TEXT, deactivated_at TEXT, deactivated_by TEXT, deactivation_reason TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS user_access_events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL, performed_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS floors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, position INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, floor_id INTEGER NOT NULL, number TEXT NOT NULL UNIQUE, type TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS guests (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, ci TEXT, phone TEXT, is_minor INTEGER NOT NULL DEFAULT 0, identification_pending INTEGER NOT NULL DEFAULT 0, updated_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS stays (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, primary_guest_id INTEGER NOT NULL, stay_type TEXT NOT NULL, check_in TEXT NOT NULL, expected_check_out TEXT, check_out TEXT, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', capacity_override INTEGER NOT NULL DEFAULT 0, capacity_override_reason TEXT, capacity_authorized_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS stay_room_segments (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, sequence INTEGER NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, start_reason TEXT NOT NULL, end_reason TEXT, created_by TEXT NOT NULL, ended_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS stay_guests (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, guest_id INTEGER NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0, joined_at TEXT, left_at TEXT, added_by TEXT, removed_by TEXT, removal_reason TEXT)`,
  `CREATE TABLE IF NOT EXISTS primary_guest_transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, previous_guest_id INTEGER NOT NULL, proposed_guest_id INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, requested_by_user_id INTEGER NOT NULL, requested_by_name TEXT NOT NULL, requested_at TEXT NOT NULL, reviewed_by_user_id INTEGER, reviewed_by_name TEXT, reviewed_at TEXT, review_note TEXT, applied_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS exit_assessments (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, segment_id INTEGER NOT NULL, delivery_inspection_id INTEGER NOT NULL, return_inspection_id INTEGER NOT NULL, work_order_id INTEGER, issue_count INTEGER NOT NULL DEFAULT 0, missing_count INTEGER NOT NULL DEFAULT 0, observed_count INTEGER NOT NULL DEFAULT 0, discrepancies TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, submitted_by_user_id INTEGER NOT NULL, submitted_by_name TEXT NOT NULL, submitted_at TEXT NOT NULL, reviewed_by_user_id INTEGER, reviewed_by_name TEXT, reviewed_at TEXT, review_note TEXT)`,
  `CREATE TABLE IF NOT EXISTS exceptional_exit_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, segment_id INTEGER NOT NULL, reason TEXT NOT NULL, witnesses TEXT NOT NULL DEFAULT '', photo_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, requested_by_user_id INTEGER NOT NULL, requested_by_name TEXT NOT NULL, requested_at TEXT NOT NULL, reviewed_by_user_id INTEGER, reviewed_by_name TEXT, reviewed_at TEXT, review_note TEXT)`,
  `CREATE TABLE IF NOT EXISTS room_events (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, primary_guest_id INTEGER NOT NULL, initial_room_id INTEGER NOT NULL, parent_contract_id INTEGER, contract_number TEXT NOT NULL, contract_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL, ended_by TEXT, ended_at TEXT, end_reason TEXT)`,
  `CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, segment_id INTEGER, work_order_id INTEGER, inventory_movement_id INTEGER, contract_id INTEGER, phase TEXT NOT NULL DEFAULT 'GENERAL', category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', filename TEXT NOT NULL, object_key TEXT NOT NULL, content_type TEXT NOT NULL, uploaded_by TEXT NOT NULL DEFAULT 'Hotel ASAEL', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, item_type TEXT NOT NULL DEFAULT 'PERMANENTE', notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS room_infrastructure_items (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, area TEXT NOT NULL, name TEXT NOT NULL, evidence_category TEXT NOT NULL, required_evidence INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS inventory_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, segment_id INTEGER NOT NULL, inventory_item_id INTEGER, item_name TEXT NOT NULL, quantity INTEGER NOT NULL, movement_type TEXT NOT NULL, reason TEXT NOT NULL, responsible TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inspections (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, segment_id INTEGER, kind TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inspection_items (id INTEGER PRIMARY KEY AUTOINCREMENT, inspection_id INTEGER NOT NULL, inventory_item_id INTEGER, name TEXT NOT NULL, quantity INTEGER NOT NULL, condition TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS room_turnovers (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, segment_id INTEGER, status TEXT NOT NULL, cleaning_started_at TEXT, cleaning_started_by TEXT, cleaning_completed_at TEXT, cleaning_completed_by TEXT, final_inspection_id INTEGER, approved_at TEXT, approved_by TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS work_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, segment_id INTEGER, type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL, status TEXT NOT NULL, assigned_user_id INTEGER, due_at TEXT, blocks_room INTEGER NOT NULL DEFAULT 0, created_by TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT, started_by TEXT, completed_at TEXT, completed_by TEXT, cancelled_at TEXT, cancelled_by TEXT, cancellation_reason TEXT)`,
  `CREATE TABLE IF NOT EXISTS work_order_history (id INTEGER PRIMARY KEY AUTOINCREMENT, work_order_id INTEGER NOT NULL, action TEXT NOT NULL, from_status TEXT, to_status TEXT, detail TEXT NOT NULL DEFAULT '', performed_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS change_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, field_name TEXT NOT NULL, old_value TEXT, proposed_value TEXT, reason TEXT NOT NULL, status TEXT NOT NULL, application_mode TEXT NOT NULL, requested_by_user_id INTEGER NOT NULL, requested_by_name TEXT NOT NULL, requested_at TEXT NOT NULL, reviewed_by_user_id INTEGER, reviewed_by_name TEXT, reviewed_at TEXT, review_note TEXT, applied_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT NOT NULL, user_role TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, room_id INTEGER, old_value TEXT, new_value TEXT, reason TEXT NOT NULL DEFAULT '', approval_request_id INTEGER, session_info TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stays_room_status ON stays(room_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_events_room_created ON room_events(room_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_stay_id ON documents(stay_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contracts_stay_status ON contracts(stay_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_contracts_end_status ON contracts(end_date, status)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_room_id ON inventory_items(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_room_infrastructure_room_active ON room_infrastructure_items(room_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_movements_segment_created ON inventory_movements(segment_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_movements_room_created ON inventory_movements(room_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_inspections_stay_kind ON inspections(stay_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_access_events_user ON user_access_events(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_guests_ci ON guests(ci)`,
  `CREATE INDEX IF NOT EXISTS idx_primary_transfers_status_requested ON primary_guest_transfers(status, requested_at)`,
  `CREATE INDEX IF NOT EXISTS idx_primary_transfers_stay_requested ON primary_guest_transfers(stay_id, requested_at)`,
  `CREATE INDEX IF NOT EXISTS idx_exit_assessments_status_submitted ON exit_assessments(status, submitted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_exit_assessments_segment_submitted ON exit_assessments(segment_id, submitted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_exceptional_exit_status_requested ON exceptional_exit_requests(status, requested_at)`,
  `CREATE INDEX IF NOT EXISTS idx_exceptional_exit_segment_requested ON exceptional_exit_requests(segment_id, requested_at)`,
  `CREATE INDEX IF NOT EXISTS idx_turnovers_room_status ON room_turnovers(room_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_stay_segments_stay_sequence ON stay_room_segments(stay_id, sequence)`,
  `CREATE INDEX IF NOT EXISTS idx_work_orders_room_status ON work_orders(room_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_work_orders_status_priority ON work_orders(status, priority)`,
  `CREATE INDEX IF NOT EXISTS idx_work_order_history_order_created ON work_order_history(work_order_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_change_requests_status_requested ON change_requests(status, requested_at)`,
  `CREATE INDEX IF NOT EXISTS idx_change_requests_entity_field ON change_requests(entity_type, entity_id, field_name)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_room_created ON audit_logs(room_id, created_at)`,
];

async function ensureDatabase() {
  const db = env.DB;
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const userColumns = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  if (!userColumns.results.some((column) => column.name === "active")) {
    await db.prepare("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
  }
  for (const [column, definition] of [["invited_by", "TEXT"], ["activated_at", "TEXT"], ["last_access_at", "TEXT"], ["deactivated_at", "TEXT"], ["deactivated_by", "TEXT"], ["deactivation_reason", "TEXT"]] as const) {
    if (!userColumns.results.some((item) => item.name === column)) await db.prepare(`ALTER TABLE users ADD COLUMN ${column} ${definition}`).run();
  }
  const floorColumns = await db.prepare("PRAGMA table_info(floors)").all<{ name: string }>();
  if (!floorColumns.results.some((column) => column.name === "active")) {
    await db.prepare("ALTER TABLE floors ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
  }
  const roomColumns = await db.prepare("PRAGMA table_info(rooms)").all<{ name: string }>();
  if (!roomColumns.results.some((column) => column.name === "active")) {
    await db.prepare("ALTER TABLE rooms ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
  }
  const guestColumns = await db.prepare("PRAGMA table_info(guests)").all<{ name: string }>();
  if (!guestColumns.results.some((column) => column.name === "identification_pending")) await db.prepare("ALTER TABLE guests ADD COLUMN identification_pending INTEGER NOT NULL DEFAULT 0").run();
  if (!guestColumns.results.some((column) => column.name === "updated_at")) await db.prepare("ALTER TABLE guests ADD COLUMN updated_at TEXT").run();
  const stayColumns = await db.prepare("PRAGMA table_info(stays)").all<{ name: string }>();
  if (!stayColumns.results.some((column) => column.name === "capacity_override")) await db.prepare("ALTER TABLE stays ADD COLUMN capacity_override INTEGER NOT NULL DEFAULT 0").run();
  if (!stayColumns.results.some((column) => column.name === "capacity_override_reason")) await db.prepare("ALTER TABLE stays ADD COLUMN capacity_override_reason TEXT").run();
  if (!stayColumns.results.some((column) => column.name === "capacity_authorized_by")) await db.prepare("ALTER TABLE stays ADD COLUMN capacity_authorized_by TEXT").run();
  const documentColumns = await db.prepare("PRAGMA table_info(documents)").all<{ name: string }>();
  if (!documentColumns.results.some((column) => column.name === "uploaded_by")) await db.prepare("ALTER TABLE documents ADD COLUMN uploaded_by TEXT NOT NULL DEFAULT 'Hotel ASAEL'").run();
  if (!documentColumns.results.some((column) => column.name === "phase")) await db.prepare("ALTER TABLE documents ADD COLUMN phase TEXT NOT NULL DEFAULT 'GENERAL'").run();
  if (!documentColumns.results.some((column) => column.name === "segment_id")) await db.prepare("ALTER TABLE documents ADD COLUMN segment_id INTEGER").run();
  if (!documentColumns.results.some((column) => column.name === "work_order_id")) await db.prepare("ALTER TABLE documents ADD COLUMN work_order_id INTEGER").run();
  if (!documentColumns.results.some((column) => column.name === "inventory_movement_id")) await db.prepare("ALTER TABLE documents ADD COLUMN inventory_movement_id INTEGER").run();
  if (!documentColumns.results.some((column) => column.name === "contract_id")) await db.prepare("ALTER TABLE documents ADD COLUMN contract_id INTEGER").run();
  if (!documentColumns.results.some((column) => column.name === "description")) await db.prepare("ALTER TABLE documents ADD COLUMN description TEXT NOT NULL DEFAULT ''").run();
  const inventoryColumns = await db.prepare("PRAGMA table_info(inventory_items)").all<{ name: string }>();
  if (!inventoryColumns.results.some((column) => column.name === "item_type")) await db.prepare("ALTER TABLE inventory_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'PERMANENTE'").run();
  const inspectionColumns = await db.prepare("PRAGMA table_info(inspections)").all<{ name: string }>();
  if (!inspectionColumns.results.some((column) => column.name === "segment_id")) await db.prepare("ALTER TABLE inspections ADD COLUMN segment_id INTEGER").run();
  const turnoverColumns = await db.prepare("PRAGMA table_info(room_turnovers)").all<{ name: string }>();
  if (!turnoverColumns.results.some((column) => column.name === "segment_id")) await db.prepare("ALTER TABLE room_turnovers ADD COLUMN segment_id INTEGER").run();
  const stayGuestColumns = await db.prepare("PRAGMA table_info(stay_guests)").all<{ name: string }>();
  if (!stayGuestColumns.results.some((column) => column.name === "joined_at")) await db.prepare("ALTER TABLE stay_guests ADD COLUMN joined_at TEXT").run();
  if (!stayGuestColumns.results.some((column) => column.name === "left_at")) await db.prepare("ALTER TABLE stay_guests ADD COLUMN left_at TEXT").run();
  if (!stayGuestColumns.results.some((column) => column.name === "added_by")) await db.prepare("ALTER TABLE stay_guests ADD COLUMN added_by TEXT").run();
  if (!stayGuestColumns.results.some((column) => column.name === "removed_by")) await db.prepare("ALTER TABLE stay_guests ADD COLUMN removed_by TEXT").run();
  if (!stayGuestColumns.results.some((column) => column.name === "removal_reason")) await db.prepare("ALTER TABLE stay_guests ADD COLUMN removal_reason TEXT").run();
  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS idx_documents_segment_id ON documents(segment_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_inspections_segment_kind ON inspections(segment_id, kind)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_documents_work_order_id ON documents(work_order_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_documents_inventory_movement_id ON documents(inventory_movement_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_stay_guests_stay_active ON stay_guests(stay_id, left_at)"),
  ]);
  await db.prepare(`INSERT INTO stay_room_segments (stay_id, room_id, sequence, started_at, ended_at, start_reason, end_reason, created_by, ended_by)
    SELECT s.id, s.room_id, 1, s.check_in, s.check_out, 'INGRESO', CASE WHEN s.status = 'FINALIZADA' THEN 'SALIDA' ELSE NULL END, 'Migración del sistema', CASE WHEN s.status = 'FINALIZADA' THEN 'Migración del sistema' ELSE NULL END
    FROM stays s WHERE NOT EXISTS (SELECT 1 FROM stay_room_segments seg WHERE seg.stay_id = s.id)`).run();
  await db.batch([
    db.prepare("UPDATE documents SET segment_id = (SELECT seg.id FROM stay_room_segments seg WHERE seg.stay_id = documents.stay_id AND seg.room_id = documents.room_id ORDER BY seg.sequence DESC LIMIT 1) WHERE segment_id IS NULL AND stay_id IS NOT NULL"),
    db.prepare("UPDATE inspections SET segment_id = (SELECT seg.id FROM stay_room_segments seg WHERE seg.stay_id = inspections.stay_id AND seg.room_id = inspections.room_id ORDER BY seg.sequence DESC LIMIT 1) WHERE segment_id IS NULL"),
    db.prepare("UPDATE room_turnovers SET segment_id = (SELECT seg.id FROM stay_room_segments seg WHERE seg.stay_id = room_turnovers.stay_id AND seg.room_id = room_turnovers.room_id ORDER BY seg.sequence DESC LIMIT 1) WHERE segment_id IS NULL"),
    db.prepare("UPDATE stay_guests SET joined_at = (SELECT s.check_in FROM stays s WHERE s.id = stay_guests.stay_id), added_by = COALESCE(added_by, 'Migración del sistema') WHERE joined_at IS NULL"),
  ]);
  const floors = await db.prepare("SELECT COUNT(*) AS total FROM floors").first<{ total: number }>();
  if (!floors?.total) {
    await db.batch([
      db.prepare("INSERT INTO floors (name, position) VALUES (?, ?)").bind("Piso 1", 1),
      db.prepare("INSERT INTO floors (name, position) VALUES (?, ?)").bind("Piso 2", 2),
      db.prepare("INSERT INTO floors (name, position) VALUES (?, ?)").bind("Piso 3", 3),
    ]);
    const saved = await db.prepare("SELECT id, position FROM floors ORDER BY position").all<{ id: number; position: number }>();
    const inserts = [];
    for (const floor of saved.results) {
      for (let offset = 1; offset <= 8; offset += 1) {
        const number = String((floor.position - 1) * 8 + offset);
        inserts.push(db.prepare("INSERT INTO rooms (floor_id, number, type, capacity, status, notes) VALUES (?, ?, ?, ?, ?, ?)").bind(floor.id, number, "Estándar", 2, "DISPONIBLE", ""));
      }
    }
    await db.batch(inserts);
  }
  const inventoryCount = await db.prepare("SELECT COUNT(*) AS total FROM inventory_items").first<{ total: number }>();
  if (!inventoryCount?.total) {
    const roomRows = await db.prepare("SELECT id FROM rooms").all<{ id: number }>();
    const baseItems = [["Cama", 1, "PERMANENTE"], ["Almohada", 2, "REUTILIZABLE"], ["Juego de sábanas", 1, "REUTILIZABLE"], ["Cubrecama", 1, "REUTILIZABLE"], ["Mesa", 1, "PERMANENTE"], ["Cómoda", 1, "PERMANENTE"], ["Silla", 1, "PERMANENTE"]] as const;
    const inventoryStatements = roomRows.results.flatMap((room) => baseItems.map(([name, quantity, itemType]) => db.prepare("INSERT INTO inventory_items (room_id, name, quantity, item_type, notes) VALUES (?, ?, ?, ?, '')").bind(room.id, name, quantity, itemType)));
    if (inventoryStatements.length) await db.batch(inventoryStatements);
  }
  const infrastructureDefaults = [
    ["ESTRUCTURA", "Paredes", "PAREDES_PISO_TECHO"], ["ESTRUCTURA", "Piso", "PAREDES_PISO_TECHO"], ["ESTRUCTURA", "Techo", "PAREDES_PISO_TECHO"],
    ["BAÑO", "Baño y grifería", "BANO"], ["ACCESOS", "Puerta y cerradura", "PUERTAS_VENTANAS"], ["ACCESOS", "Ventanas y cortinas", "PUERTAS_VENTANAS"],
    ["ELECTRICIDAD", "Iluminación", "ILUMINACION_ENCHUFES"], ["ELECTRICIDAD", "Enchufes", "ILUMINACION_ENCHUFES"],
  ] as const;
  await db.batch(infrastructureDefaults.map(([area, name, category]) => db.prepare(`INSERT INTO room_infrastructure_items (room_id, area, name, evidence_category, required_evidence, active, notes)
    SELECT r.id, ?, ?, ?, 1, 1, '' FROM rooms r
    WHERE NOT EXISTS (SELECT 1 FROM room_infrastructure_items configured WHERE configured.room_id = r.id AND lower(configured.name) = lower(?))`).bind(area, name, category, name)));
  await db.prepare("PRAGMA optimize").run();
}

function currentUser(request: Request) {
  const url = new URL(request.url);
  const suppliedId = request.headers.get("oai-authenticated-user-id");
  if (!suppliedId && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("UNAUTHORIZED");
  }
  const externalId = suppliedId || "local-owner";
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  let name = "Propietario ASAEL";
  if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { name = decodeURIComponent(encodedName); } catch { /* use fallback */ }
  }
  return { externalId, email, name };
}

async function ensureUser(request: Request) {
  const user = currentUser(request);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id, name, email, role, active, last_access_at FROM users WHERE external_id = ?").bind(user.externalId).first<{ id: number; name: string; email: string; role: string; active: number; last_access_at?: string }>();
  if (existing && !existing.active) throw new Error("DEACTIVATED");
  if (existing) {
    const shouldLogSession = !existing.last_access_at || Date.now() - new Date(existing.last_access_at).getTime() >= 8 * 60 * 60 * 1000;
    const statements = [env.DB.prepare("UPDATE users SET last_access_at = ? WHERE id = ?").bind(now, existing.id)];
    if (shouldLogSession) statements.push(env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'SESION_INICIADA', 'Acceso verificado mediante correo autorizado', ?, ?)").bind(existing.id, existing.name, now));
    await env.DB.batch(statements);
    return { ...existing, last_access_at: now };
  }
  const invited = await env.DB.prepare("SELECT id, name, email, role, active, external_id FROM users WHERE lower(email) = lower(?)").bind(user.email.trim()).first<{ id: number; name: string; email: string; role: string; active: number; external_id: string }>();
  if (invited && !invited.active) throw new Error("DEACTIVATED");
  if (invited && invited.external_id.startsWith("pending:")) {
    await env.DB.prepare("UPDATE users SET external_id = ?, name = CASE WHEN name = '' THEN ? ELSE name END, activated_at = ?, last_access_at = ?, deactivated_at = NULL, deactivated_by = NULL, deactivation_reason = NULL WHERE id = ?").bind(user.externalId, user.name, now, now, invited.id).run();
    await env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'PRIMER_ACCESO', 'Correo verificado al iniciar sesión', ?, ?)").bind(invited.id, user.name, new Date().toISOString()).run();
    return env.DB.prepare("SELECT id, name, email, role, active FROM users WHERE id = ?").bind(invited.id).first();
  }
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if (count?.total) throw new Error("NOT_AUTHORIZED");
  const role = "PROPIETARIO";
  await env.DB.prepare("INSERT INTO users (external_id, email, name, role, active, activated_at, last_access_at, created_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)").bind(user.externalId, user.email, user.name, role, now, now, now).run();
  return env.DB.prepare("SELECT id, name, email, role, active FROM users WHERE external_id = ?").bind(user.externalId).first();
}

function userErrorResponse(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "UNAUTHORIZED") return Response.json({ error: "Debes iniciar sesión con tu correo autorizado." }, { status: 401 });
  if (error.message === "DEACTIVATED") return Response.json({ error: "Tu acceso fue desactivado. Contacta a administración." }, { status: 403 });
  if (error.message === "NOT_AUTHORIZED") return Response.json({ error: "Este correo no está autorizado para ingresar al Hotel ASAEL." }, { status: 403 });
  return null;
}

type AuditFeedRow = { source: string; id: number; action: string; entity_type: string; entity_id?: number; room_id?: number; room_number?: string; actor?: string; detail?: string; old_value?: string; new_value?: string; created_at: string };

async function loadAuditFeed(role: string) {
  if (role === "RECEPCION") return { results: [] as AuditFeedRow[] };
  const parts = await Promise.all([
    env.DB.prepare(`SELECT 'AUDITORIA' AS source, a.id, a.action, a.entity_type, a.entity_id, a.room_id, r.number AS room_number, a.user_name AS actor, a.reason AS detail, a.old_value, a.new_value, a.created_at
      FROM audit_logs a LEFT JOIN rooms r ON r.id = a.room_id`).all<AuditFeedRow>(),
    env.DB.prepare(`SELECT 'HABITACION' AS source, e.id, e.type AS action, 'ROOM_EVENT' AS entity_type, e.stay_id AS entity_id, e.room_id, r.number AS room_number, e.created_by AS actor, e.title || CASE WHEN e.detail != '' THEN ' · ' || e.detail ELSE '' END AS detail, NULL AS old_value, e.status AS new_value, e.created_at
      FROM room_events e JOIN rooms r ON r.id = e.room_id`).all<AuditFeedRow>(),
    env.DB.prepare(`SELECT 'TAREA' AS source, h.id, h.action, 'WORK_ORDER' AS entity_type, h.work_order_id AS entity_id, w.room_id, r.number AS room_number, h.performed_by AS actor, h.detail, h.from_status AS old_value, h.to_status AS new_value, h.created_at
      FROM work_order_history h JOIN work_orders w ON w.id = h.work_order_id JOIN rooms r ON r.id = w.room_id`).all<AuditFeedRow>(),
    env.DB.prepare(`SELECT 'ACCESO' AS source, ua.id, ua.action, 'USER' AS entity_type, ua.user_id AS entity_id, NULL AS room_id, NULL AS room_number, ua.performed_by AS actor, ua.reason AS detail, NULL AS old_value, u.email AS new_value, ua.created_at
      FROM user_access_events ua JOIN users u ON u.id = ua.user_id`).all<AuditFeedRow>(),
    env.DB.prepare(`SELECT 'APROBACION' AS source, c.id, 'SOLICITUD_' || c.status AS action, c.entity_type, c.entity_id, c.room_id, r.number AS room_number, c.requested_by_name AS actor, c.reason AS detail, c.old_value, c.proposed_value AS new_value, c.requested_at AS created_at
      FROM change_requests c JOIN rooms r ON r.id = c.room_id`).all<AuditFeedRow>(),
    env.DB.prepare(`SELECT 'APROBACION' AS source, -c.id AS id, 'RESOLUCION_' || c.status AS action, c.entity_type, c.entity_id, c.room_id, r.number AS room_number, c.reviewed_by_name AS actor, COALESCE(c.review_note, '') AS detail, c.old_value, c.proposed_value AS new_value, c.reviewed_at AS created_at
      FROM change_requests c JOIN rooms r ON r.id = c.room_id WHERE c.reviewed_at IS NOT NULL`).all<AuditFeedRow>(),
  ]);
  const results = parts.flatMap((part) => part.results).sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))).slice(0, 500);
  return { results };
}

type OperationalAlertRow = { type: string; room_id: number; room_number: string; stay_id?: number; work_order_id?: number; created_at: string; days_overdue: number };

async function loadOperationalAlerts() {
  const groups = await Promise.all([
    env.DB.prepare(`SELECT 'ACTA_ENTREGA_VENCIDA' AS type, r.id AS room_id, r.number AS room_number, s.id AS stay_id, NULL AS work_order_id, seg.started_at AS created_at, CAST(julianday('now') - julianday(seg.started_at) AS INTEGER) AS days_overdue
      FROM stays s JOIN rooms r ON r.id = s.room_id JOIN stay_room_segments seg ON seg.stay_id = s.id AND seg.room_id = r.id AND seg.ended_at IS NULL
      WHERE s.status = 'ACTIVA' AND julianday('now') - julianday(seg.started_at) >= 1
      AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.segment_id = seg.id AND d.category = 'ACTA_ENTREGA_FIRMADA')`).all<OperationalAlertRow>(),
    env.DB.prepare(`SELECT 'CIERRE_OPERATIVO' AS type, r.id AS room_id, r.number AS room_number, t.stay_id, NULL AS work_order_id, t.created_at, 0 AS days_overdue
      FROM room_turnovers t JOIN rooms r ON r.id = t.room_id WHERE t.status != 'COMPLETADO'`).all<OperationalAlertRow>(),
    env.DB.prepare(`SELECT 'ESTADIA_VENCIDA' AS type, r.id AS room_id, r.number AS room_number, s.id AS stay_id, NULL AS work_order_id, s.expected_check_out AS created_at, CAST(julianday('now') - julianday(s.expected_check_out) AS INTEGER) AS days_overdue
      FROM stays s JOIN rooms r ON r.id = s.room_id WHERE s.status = 'ACTIVA' AND s.expected_check_out IS NOT NULL AND datetime(s.expected_check_out, '+1 day') < datetime('now')`).all<OperationalAlertRow>(),
    env.DB.prepare(`SELECT CASE WHEN datetime(w.due_at) < datetime('now') THEN 'TAREA_VENCIDA' ELSE 'TAREA_POR_VENCER' END AS type,
        r.id AS room_id, r.number AS room_number, w.stay_id, w.id AS work_order_id, w.due_at AS created_at,
        CASE WHEN datetime(w.due_at) < datetime('now') THEN CAST(julianday('now') - julianday(w.due_at) AS INTEGER) ELSE 0 END AS days_overdue
      FROM work_orders w JOIN rooms r ON r.id = w.room_id
      WHERE w.status IN ('PENDIENTE', 'EN_PROCESO') AND w.due_at IS NOT NULL AND datetime(w.due_at) <= datetime('now', '+1 day')`).all<OperationalAlertRow>(),
    env.DB.prepare(`SELECT 'CONTRATO_SIN_RESPALDO' AS type, s.room_id, r.number AS room_number, c.stay_id, NULL AS work_order_id, c.created_at, 0 AS days_overdue
      FROM contracts c JOIN stays s ON s.id = c.stay_id JOIN rooms r ON r.id = s.room_id
      WHERE c.status = 'PENDIENTE_DOCUMENTO'`).all<OperationalAlertRow>(),
    env.DB.prepare(`SELECT CASE WHEN date(c.end_date) < date('now') THEN 'CONTRATO_VENCIDO' ELSE 'CONTRATO_POR_VENCER' END AS type,
        s.room_id, r.number AS room_number, c.stay_id, NULL AS work_order_id, c.end_date AS created_at,
        CASE WHEN date(c.end_date) < date('now') THEN CAST(julianday('now') - julianday(c.end_date) AS INTEGER) ELSE 0 END AS days_overdue
      FROM contracts c JOIN stays s ON s.id = c.stay_id JOIN rooms r ON r.id = s.room_id
      WHERE c.status = 'VIGENTE' AND c.end_date IS NOT NULL AND date(c.end_date) <= date('now', '+7 days')`).all<OperationalAlertRow>(),
  ]);
  return { results: groups.flatMap((group) => group.results).sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))) };
}

export async function GET(request: Request) {
  await ensureDatabase();
  let user;
  try { user = await ensureUser(request); } catch (error) { const response = userErrorResponse(error); if (response) return response; throw error; }
  const [floors, rooms, events, inventory, infrastructure, inventoryMovements, inspections, inspectionItems, users, accessEvents, contracts, documents, alerts, segments, workOrders, workOrderHistory, changeRequests, occupants, guestProfiles, guestStayHistory, primaryTransfers, exitAssessments, exceptionalExitRequests, auditFeed] = await Promise.all([
    env.DB.prepare("SELECT id, name, position, active FROM floors ORDER BY position, name").all(),
    env.DB.prepare(`SELECT r.*, s.id AS stay_id, s.stay_type, s.check_in, s.expected_check_out, s.notes AS stay_notes, g.id AS guest_id, g.full_name AS guest_name, g.ci AS guest_ci, g.phone AS guest_phone,
      (SELECT COUNT(*) FROM stay_guests sg WHERE sg.stay_id = s.id AND sg.left_at IS NULL) AS guest_count,
      t.id AS turnover_id, t.status AS turnover_status, t.cleaning_started_at, t.cleaning_started_by, t.cleaning_completed_at, t.cleaning_completed_by,
      COALESCE((SELECT seg.id FROM stay_room_segments seg WHERE seg.stay_id = s.id AND seg.room_id = r.id AND seg.ended_at IS NULL ORDER BY seg.sequence DESC LIMIT 1), t.segment_id) AS current_segment_id
      FROM rooms r
      LEFT JOIN room_turnovers t ON t.id = (SELECT id FROM room_turnovers rt WHERE rt.room_id = r.id AND rt.status != 'COMPLETADO' ORDER BY rt.created_at DESC LIMIT 1)
      LEFT JOIN stays s ON s.id = COALESCE((SELECT id FROM stays sa WHERE sa.room_id = r.id AND sa.status = 'ACTIVA' ORDER BY sa.check_in DESC LIMIT 1), t.stay_id)
      LEFT JOIN guests g ON g.id = s.primary_guest_id ORDER BY CAST(r.number AS INTEGER), r.number`).all(),
    env.DB.prepare("SELECT e.*, r.number AS room_number FROM room_events e JOIN rooms r ON r.id = e.room_id ORDER BY e.created_at DESC LIMIT 12").all(),
    env.DB.prepare("SELECT id, room_id, name, quantity, item_type, notes FROM inventory_items ORDER BY name").all(),
    env.DB.prepare("SELECT * FROM room_infrastructure_items ORDER BY room_id, area, name").all(),
    env.DB.prepare("SELECT * FROM inventory_movements ORDER BY created_at DESC").all(),
    env.DB.prepare("SELECT * FROM inspections ORDER BY created_at DESC").all(),
    env.DB.prepare("SELECT * FROM inspection_items ORDER BY id").all(),
    env.DB.prepare(`SELECT id, name, CASE WHEN ? = 'RECEPCION' THEN '' ELSE email END AS email, role, active, created_at, activated_at, last_access_at, deactivated_at, deactivated_by, deactivation_reason,
      CASE WHEN external_id LIKE 'pending:%' THEN 'PENDIENTE' WHEN active = 0 THEN 'DESACTIVADO' ELSE 'ACTIVO' END AS access_status
      FROM users WHERE ? != 'RECEPCION' OR active = 1 ORDER BY active DESC, name`).bind(user?.role || "RECEPCION", user?.role || "RECEPCION").all(),
    user?.role === "RECEPCION" ? Promise.resolve({ results: [] }) : env.DB.prepare(`SELECT ua.id, ua.user_id, ua.action, ua.reason, ua.performed_by, ua.created_at, u.name AS user_name, u.email AS user_email
      FROM user_access_events ua JOIN users u ON u.id = ua.user_id ORDER BY ua.created_at DESC LIMIT 250`).all(),
    env.DB.prepare(`SELECT c.*, g.full_name AS guest_name, r.number AS room_number,
      (SELECT COUNT(*) FROM documents d WHERE d.contract_id = c.id AND d.category = 'CONTRATO') AS document_count
      FROM contracts c JOIN guests g ON g.id = c.primary_guest_id JOIN rooms r ON r.id = c.initial_room_id ORDER BY c.created_at DESC`).all(),
    env.DB.prepare("SELECT id, room_id, stay_id, segment_id, work_order_id, inventory_movement_id, contract_id, phase, category, description, filename, content_type, uploaded_by, created_at FROM documents ORDER BY created_at DESC").all(),
    loadOperationalAlerts(),
    env.DB.prepare(`SELECT seg.*, r.number AS room_number,
      (SELECT COUNT(*) FROM documents d WHERE d.segment_id = seg.id) AS document_count,
      (SELECT COUNT(*) FROM inspections i WHERE i.segment_id = seg.id AND i.kind = 'ENTREGA') AS delivery_count,
      (SELECT COUNT(*) FROM inspections i WHERE i.segment_id = seg.id AND i.kind = 'DEVOLUCION') AS return_count,
      EXISTS(SELECT 1 FROM documents d WHERE d.segment_id = seg.id AND d.category = 'ACTA_ENTREGA_FIRMADA') AS delivery_signed,
      EXISTS(SELECT 1 FROM documents d WHERE d.segment_id = seg.id AND d.category = 'ACTA_DEVOLUCION_FIRMADA') AS return_signed
      FROM stay_room_segments seg JOIN rooms r ON r.id = seg.room_id ORDER BY seg.stay_id, seg.sequence`).all(),
    env.DB.prepare(`SELECT w.*, r.number AS room_number, u.name AS assigned_name, u.active AS assigned_active,
      (SELECT COUNT(*) FROM documents d WHERE d.work_order_id = w.id AND d.category = 'TRABAJO_ANTES') AS before_count,
      (SELECT COUNT(*) FROM documents d WHERE d.work_order_id = w.id AND d.category = 'TRABAJO_DESPUES') AS after_count
      FROM work_orders w JOIN rooms r ON r.id = w.room_id LEFT JOIN users u ON u.id = w.assigned_user_id
      ORDER BY CASE w.status WHEN 'EN_PROCESO' THEN 0 WHEN 'PENDIENTE' THEN 1 WHEN 'COMPLETADO' THEN 2 ELSE 3 END,
      CASE w.priority WHEN 'URGENTE' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END, w.created_at DESC`).all(),
    env.DB.prepare("SELECT * FROM work_order_history ORDER BY created_at DESC").all(),
    env.DB.prepare(`SELECT c.*, r.number AS room_number FROM change_requests c JOIN rooms r ON r.id = c.room_id
      WHERE ? != 'RECEPCION' OR c.requested_by_user_id = ? ORDER BY CASE c.status WHEN 'PENDIENTE' THEN 0 ELSE 1 END, c.requested_at DESC`).bind(user?.role || "RECEPCION", user?.id || 0).all(),
    env.DB.prepare(`SELECT sg.id, sg.stay_id, sg.guest_id, sg.is_primary, sg.joined_at, sg.left_at, sg.added_by, sg.removed_by, sg.removal_reason,
      g.full_name, g.ci, g.phone, g.is_minor, g.identification_pending, s.room_id, r.number AS room_number
      FROM stay_guests sg JOIN guests g ON g.id = sg.guest_id JOIN stays s ON s.id = sg.stay_id JOIN rooms r ON r.id = s.room_id
      ORDER BY sg.stay_id, sg.is_primary DESC, sg.joined_at`).all(),
    env.DB.prepare(`SELECT g.id, g.full_name, g.ci, g.phone, g.is_minor, g.identification_pending, g.updated_at, g.created_at,
      COUNT(DISTINCT sg.stay_id) AS stay_count,
      SUM(CASE WHEN s.status = 'ACTIVA' AND sg.left_at IS NULL THEN 1 ELSE 0 END) AS active_memberships,
      MAX(CASE WHEN s.status = 'ACTIVA' AND sg.left_at IS NULL THEN s.room_id ELSE NULL END) AS active_room_id,
      MAX(CASE WHEN s.status = 'ACTIVA' AND sg.left_at IS NULL THEN r.number ELSE NULL END) AS active_room_number
      FROM guests g LEFT JOIN stay_guests sg ON sg.guest_id = g.id LEFT JOIN stays s ON s.id = sg.stay_id LEFT JOIN rooms r ON r.id = s.room_id
      GROUP BY g.id ORDER BY g.full_name COLLATE NOCASE`).all(),
    env.DB.prepare(`SELECT sg.id AS membership_id, sg.guest_id, sg.stay_id, sg.is_primary, sg.joined_at, sg.left_at, sg.removal_reason,
      s.stay_type, s.check_in, s.expected_check_out, s.check_out, s.status, s.room_id, r.number AS room_number,
      (SELECT COUNT(*) FROM documents d WHERE d.stay_id = s.id) AS document_count,
      (SELECT COUNT(*) FROM stay_room_segments seg WHERE seg.stay_id = s.id) AS room_count
      FROM stay_guests sg JOIN stays s ON s.id = sg.stay_id JOIN rooms r ON r.id = s.room_id
      ORDER BY s.check_in DESC, sg.id DESC`).all(),
    env.DB.prepare(`SELECT t.*, r.number AS room_number, previous.full_name AS previous_guest_name, proposed.full_name AS proposed_guest_name
      FROM primary_guest_transfers t JOIN rooms r ON r.id = t.room_id JOIN guests previous ON previous.id = t.previous_guest_id JOIN guests proposed ON proposed.id = t.proposed_guest_id
      WHERE ? != 'RECEPCION' OR t.requested_by_user_id = ? ORDER BY t.requested_at DESC`).bind(user?.role || "RECEPCION", user?.id || 0).all(),
    env.DB.prepare(`SELECT a.*, r.number AS room_number, g.full_name AS guest_name, w.title AS work_order_title, w.status AS work_order_status
      FROM exit_assessments a JOIN rooms r ON r.id = a.room_id JOIN stays s ON s.id = a.stay_id JOIN guests g ON g.id = s.primary_guest_id LEFT JOIN work_orders w ON w.id = a.work_order_id
      ORDER BY a.submitted_at DESC`).all(),
    env.DB.prepare(`SELECT request.*, r.number AS room_number, g.full_name AS guest_name
      FROM exceptional_exit_requests request JOIN rooms r ON r.id = request.room_id JOIN stays s ON s.id = request.stay_id JOIN guests g ON g.id = s.primary_guest_id
      WHERE ? != 'RECEPCION' OR request.requested_by_user_id = ? ORDER BY request.requested_at DESC`).bind(user?.role || "RECEPCION", user?.id || 0).all(),
    loadAuditFeed(user?.role || "RECEPCION"),
  ]);
  return Response.json({ user, floors: floors.results, rooms: rooms.results, events: events.results, inventory: inventory.results, infrastructure: infrastructure.results, inventoryMovements: inventoryMovements.results, inspections: inspections.results, inspectionItems: inspectionItems.results, users: users.results, accessEvents: accessEvents.results, contracts: contracts.results, documents: documents.results, alerts: alerts.results, segments: segments.results, workOrders: workOrders.results, workOrderHistory: workOrderHistory.results, changeRequests: changeRequests.results, occupants: occupants.results, guestProfiles: guestProfiles.results, guestStayHistory: guestStayHistory.results, primaryTransfers: primaryTransfers.results, exitAssessments: exitAssessments.results, exceptionalExitRequests: exceptionalExitRequests.results, auditFeed: auditFeed.results });
}

type ActionPayload = Record<string, unknown> & { action?: string };

function normalizeCi(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const correctionFields: Record<string, { entityType: "GUEST" | "STAY"; label: string }> = {
  full_name: { entityType: "GUEST", label: "Nombre del huésped" },
  ci: { entityType: "GUEST", label: "CI del huésped" },
  phone: { entityType: "GUEST", label: "Celular / WhatsApp" },
  expected_check_out: { entityType: "STAY", label: "Fecha prevista de salida" },
  stay_type: { entityType: "STAY", label: "Modalidad de estadía" },
  notes: { entityType: "STAY", label: "Observaciones de estadía" },
};

async function correctionValue(entityType: "GUEST" | "STAY", entityId: number, fieldName: string) {
  if (entityType === "GUEST") {
    const row = await env.DB.prepare("SELECT full_name, ci, phone FROM guests WHERE id = ?").bind(entityId).first<Record<string, string | null>>();
    return row ? row[fieldName] ?? "" : null;
  }
  const row = await env.DB.prepare("SELECT expected_check_out, stay_type, notes FROM stays WHERE id = ?").bind(entityId).first<Record<string, string | null>>();
  return row ? row[fieldName] ?? "" : null;
}

async function applyCorrection(entityType: "GUEST" | "STAY", entityId: number, fieldName: string, proposedValue: string, now: string) {
  if (entityType === "GUEST" && fieldName === "full_name") return env.DB.prepare("UPDATE guests SET full_name = ?, updated_at = ? WHERE id = ?").bind(proposedValue, now, entityId).run();
  if (entityType === "GUEST" && fieldName === "ci") return env.DB.prepare("UPDATE guests SET ci = ?, identification_pending = 0, updated_at = ? WHERE id = ?").bind(proposedValue, now, entityId).run();
  if (entityType === "GUEST" && fieldName === "phone") return env.DB.prepare("UPDATE guests SET phone = ?, updated_at = ? WHERE id = ?").bind(proposedValue || null, now, entityId).run();
  if (entityType === "STAY" && fieldName === "expected_check_out") return env.DB.prepare("UPDATE stays SET expected_check_out = ? WHERE id = ?").bind(proposedValue || null, entityId).run();
  if (entityType === "STAY" && fieldName === "stay_type") return env.DB.prepare("UPDATE stays SET stay_type = ? WHERE id = ?").bind(proposedValue, entityId).run();
  if (entityType === "STAY" && fieldName === "notes") return env.DB.prepare("UPDATE stays SET notes = ? WHERE id = ?").bind(proposedValue, entityId).run();
  throw new Error("Campo de corrección inválido.");
}

async function logAudit(request: Request, user: { id?: number; name?: string; role?: string } | null, entry: { action: string; entityType: string; entityId?: number | null; roomId?: number | null; oldValue?: unknown; newValue?: unknown; reason?: string; approvalRequestId?: number | null }, createdAt: string) {
  const sessionInfo = JSON.stringify({ userAgent: request.headers.get("user-agent") || "No disponible" });
  const serialize = (value: unknown) => value === undefined || value === null ? null : typeof value === "string" ? value : JSON.stringify(value);
  await env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, room_id, old_value, new_value, reason, approval_request_id, session_info, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(user?.id || null, user?.name || "Usuario", user?.role || "DESCONOCIDO", entry.action, entry.entityType, entry.entityId || null, entry.roomId || null, serialize(entry.oldValue), serialize(entry.newValue), entry.reason || "", entry.approvalRequestId || null, sessionInfo, createdAt).run();
}

async function applyPrimaryGuestTransfer(stayId: number, roomId: number, previousGuestId: number, proposedGuestId: number, previousName: string, proposedName: string, reason: string, actor: string, now: string) {
  await env.DB.batch([
    env.DB.prepare("UPDATE stays SET primary_guest_id = ? WHERE id = ? AND primary_guest_id = ? AND status = 'ACTIVA'").bind(proposedGuestId, stayId, previousGuestId),
    env.DB.prepare("UPDATE stay_guests SET is_primary = CASE WHEN guest_id = ? THEN 1 ELSE 0 END WHERE stay_id = ? AND left_at IS NULL").bind(proposedGuestId, stayId),
    env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'TITULARIDAD', 'Traspaso de titularidad', ?, 'COMPLETADO', ?, ?)").bind(roomId, stayId, `${previousName} → ${proposedName} · ${reason}`, actor, now),
  ]);
}

type ComparedInspectionItem = { inventory_item_id: number | null; name: string; quantity: number; condition: string; notes: string };

async function compareDeliveryAndReturn(deliveryInspectionId: number, returnInspectionId: number) {
  const [delivery, returned] = await Promise.all([
    env.DB.prepare("SELECT inventory_item_id, name, quantity, condition, notes FROM inspection_items WHERE inspection_id = ?").bind(deliveryInspectionId).all<ComparedInspectionItem>(),
    env.DB.prepare("SELECT inventory_item_id, name, quantity, condition, notes FROM inspection_items WHERE inspection_id = ?").bind(returnInspectionId).all<ComparedInspectionItem>(),
  ]);
  const key = (item: ComparedInspectionItem) => item.inventory_item_id ? "id:" + item.inventory_item_id : "name:" + item.name.trim().toLowerCase();
  const returnedByKey = new Map(returned.results.map((item) => [key(item), item]));
  const severity: Record<string, number> = { BUENO: 0, OBSERVADO: 1, FALTANTE: 2 };
  const discrepancies = delivery.results.flatMap((delivered) => {
    const returnedItem = returnedByKey.get(key(delivered));
    const returnedCondition = returnedItem?.condition || "FALTANTE";
    const returnedQuantity = returnedItem?.quantity || 0;
    const worsened = (severity[returnedCondition] ?? 2) > (severity[delivered.condition] ?? 0);
    const quantityMissing = returnedQuantity < delivered.quantity;
    if (!worsened && !quantityMissing) return [];
    return [{ name: delivered.name, deliveredQuantity: delivered.quantity, returnedQuantity, deliveredCondition: delivered.condition, returnedCondition, notes: returnedItem?.notes || "Sin observación registrada" }];
  });
  return {
    discrepancies,
    issueCount: discrepancies.length,
    missingCount: discrepancies.filter((item) => item.returnedCondition === "FALTANTE" || item.returnedQuantity < item.deliveredQuantity).length,
    observedCount: discrepancies.filter((item) => item.returnedCondition === "OBSERVADO").length,
  };
}

export async function POST(request: Request) {
  await ensureDatabase();
  let user;
  try { user = await ensureUser(request) as { id?: number; name?: string; role?: string } | null; } catch (error) { const response = userErrorResponse(error); if (response) return response; throw error; }
  const body = await request.json() as ActionPayload;
  const now = new Date().toISOString();
  const roomId = Number(body.roomId);
  const canConfigure = user?.role === "PROPIETARIO" || user?.role === "ADMINISTRADOR";

  if (body.action === "contract_create") {
    const stay = await env.DB.prepare("SELECT id, primary_guest_id, status FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number; primary_guest_id: number; status: string }>();
    if (!stay) return Response.json({ error: "No existe una estadía activa para registrar el contrato." }, { status: 409 });
    const existing = await env.DB.prepare("SELECT id FROM contracts WHERE stay_id = ? AND status IN ('PENDIENTE_DOCUMENTO', 'VIGENTE') LIMIT 1").bind(stay.id).first();
    if (existing) return Response.json({ error: "La estadía ya tiene un contrato pendiente o vigente." }, { status: 409 });
    const contractType = ["ARRENDAMIENTO", "ALOJAMIENTO", "OTRO"].includes(String(body.contractType)) ? String(body.contractType) : "ARRENDAMIENTO";
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim() || null;
    const notes = String(body.notes || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate))) return Response.json({ error: "Indica fechas contractuales válidas." }, { status: 400 });
    const provisional = String(body.contractNumber || "").trim() || "PENDIENTE";
    const result = await env.DB.prepare("INSERT INTO contracts (stay_id, primary_guest_id, initial_room_id, contract_number, contract_type, start_date, end_date, status, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_DOCUMENTO', ?, ?, ?)").bind(stay.id, stay.primary_guest_id, roomId, provisional, contractType, startDate, endDate, notes, user?.name || "Recepción", now).run();
    const contractId = Number(result.meta.last_row_id);
    const contractNumber = provisional === "PENDIENTE" ? `ASAEL-${startDate.slice(0, 4)}-${String(contractId).padStart(4, "0")}` : provisional;
    if (contractNumber !== provisional) await env.DB.prepare("UPDATE contracts SET contract_number = ? WHERE id = ?").bind(contractNumber, contractId).run();
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CONTRATO', 'Contrato registrado', ?, 'PENDIENTE', ?, ?)").bind(roomId, stay.id, `${contractNumber} · Falta cargar el respaldo firmado`, user?.name || "Recepción", now).run();
    await logAudit(request, user, { action: "CONTRATO_CREADO", entityType: "CONTRACT", entityId: contractId, roomId, newValue: { contractNumber, contractType, startDate, endDate, status: "PENDIENTE_DOCUMENTO" }, reason: notes || "Registro contractual" }, now);
    return Response.json({ ok: true, contractId, contractNumber });
  }

  if (body.action === "contract_renew") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede renovar contratos." }, { status: 403 });
    const contractId = Number(body.contractId);
    const current = await env.DB.prepare("SELECT * FROM contracts WHERE id = ? AND status = 'VIGENTE'").bind(contractId).first<{ id: number; stay_id: number; primary_guest_id: number; initial_room_id: number; contract_type: string; contract_number: string }>();
    if (!current) return Response.json({ error: "El contrato no está vigente o ya fue renovado." }, { status: 409 });
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim() || null;
    const reason = String(body.reason || "").trim();
    if (!reason || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || (endDate && endDate < startDate)) return Response.json({ error: "Indica fechas y motivo de renovación válidos." }, { status: 400 });
    const result = await env.DB.prepare("INSERT INTO contracts (stay_id, primary_guest_id, initial_room_id, parent_contract_id, contract_number, contract_type, start_date, end_date, status, notes, created_by, created_at) VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, 'PENDIENTE_DOCUMENTO', ?, ?, ?)").bind(current.stay_id, current.primary_guest_id, roomId || current.initial_room_id, current.id, current.contract_type, startDate, endDate, reason, user?.name || "Administración", now).run();
    const newId = Number(result.meta.last_row_id);
    const contractNumber = `ASAEL-${startDate.slice(0, 4)}-${String(newId).padStart(4, "0")}`;
    await env.DB.batch([
      env.DB.prepare("UPDATE contracts SET status = 'RENOVADO', ended_by = ?, ended_at = ?, end_reason = ? WHERE id = ? AND status = 'VIGENTE'").bind(user?.name || "Administración", now, reason, current.id),
      env.DB.prepare("UPDATE contracts SET contract_number = ? WHERE id = ?").bind(contractNumber, newId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CONTRATO', 'Contrato renovado', ?, 'PENDIENTE', ?, ?)").bind(roomId || current.initial_room_id, current.stay_id, `${current.contract_number} → ${contractNumber} · Falta respaldo`, user?.name || "Administración", now),
    ]);
    await logAudit(request, user, { action: "CONTRATO_RENOVADO", entityType: "CONTRACT", entityId: newId, roomId: roomId || current.initial_room_id, oldValue: { contractId: current.id, status: "VIGENTE" }, newValue: { contractNumber, status: "PENDIENTE_DOCUMENTO", startDate, endDate }, reason }, now);
    return Response.json({ ok: true, contractId: newId, contractNumber });
  }

  if (body.action === "contract_terminate") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede finalizar contratos." }, { status: 403 });
    const contractId = Number(body.contractId);
    const reason = String(body.reason || "").trim();
    if (!contractId || !reason) return Response.json({ error: "Indica el contrato y el motivo de finalización." }, { status: 400 });
    const contract = await env.DB.prepare("SELECT id, stay_id, initial_room_id, contract_number, status FROM contracts WHERE id = ?").bind(contractId).first<{ id: number; stay_id: number; initial_room_id: number; contract_number: string; status: string }>();
    if (!contract || !["VIGENTE", "PENDIENTE_DOCUMENTO"].includes(contract.status)) return Response.json({ error: "El contrato ya no puede finalizarse." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE contracts SET status = 'FINALIZADO', ended_by = ?, ended_at = ?, end_reason = ? WHERE id = ? AND status IN ('VIGENTE', 'PENDIENTE_DOCUMENTO')").bind(user?.name || "Administración", now, reason, contract.id),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CONTRATO', 'Contrato finalizado', ?, 'COMPLETADO', ?, ?)").bind(roomId || contract.initial_room_id, contract.stay_id, `${contract.contract_number} · ${reason}`, user?.name || "Administración", now),
    ]);
    await logAudit(request, user, { action: "CONTRATO_FINALIZADO", entityType: "CONTRACT", entityId: contract.id, roomId: roomId || contract.initial_room_id, oldValue: { status: contract.status }, newValue: { status: "FINALIZADO" }, reason }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "exceptional_exit_submit") {
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number }>();
    if (!stay) return Response.json({ error: "No existe una estadía activa." }, { status: 409 });
    const segment = await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stay.id, roomId).first<{ id: number }>();
    if (!segment) return Response.json({ error: "No existe un tramo activo para esta salida." }, { status: 409 });
    const reason = String(body.reason || "").trim();
    const witnesses = String(body.witnesses || "").trim();
    if (!reason) return Response.json({ error: "Indica por qué el huésped no firmará el acta." }, { status: 400 });
    const [returnInspection, photoCount, existing] = await Promise.all([
      env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind = 'DEVOLUCION' ORDER BY created_at DESC LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT COUNT(*) AS total FROM documents WHERE segment_id = ? AND category = 'SALIDA_SIN_FIRMA'").bind(segment.id).first<{ total: number }>(),
      env.DB.prepare("SELECT id FROM exceptional_exit_requests WHERE segment_id = ? AND status = 'PENDIENTE' LIMIT 1").bind(segment.id).first(),
    ]);
    if (!returnInspection) return Response.json({ error: "Primero completa el acta de devolución." }, { status: 409 });
    if (!photoCount?.total) return Response.json({ error: "Carga al menos una fotografía de respaldo de la salida sin firma." }, { status: 409 });
    if (existing) return Response.json({ error: "Ya existe una solicitud de salida sin firma pendiente." }, { status: 409 });
    const result = await env.DB.prepare("INSERT INTO exceptional_exit_requests (stay_id, room_id, segment_id, reason, witnesses, photo_count, status, requested_by_user_id, requested_by_name, requested_at) VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?)").bind(stay.id, roomId, segment.id, reason, witnesses, photoCount.total, user?.id || 0, user?.name || "Recepción", now).run();
    const requestId = Number(result.meta.last_row_id);
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', 'Salida sin firma solicitada', ?, 'PENDIENTE', ?, ?)").bind(roomId, stay.id, `${reason}${witnesses ? " · Testigos: " + witnesses : ""} · ${photoCount.total} fotografía(s)`, user?.name || "Recepción", now).run();
    await logAudit(request, user, { action: "SALIDA_SIN_FIRMA_SOLICITADA", entityType: "EXCEPTIONAL_EXIT", entityId: requestId, roomId, newValue: { witnesses, photoCount: photoCount.total, status: "PENDIENTE" }, reason }, now);
    return Response.json({ ok: true, requestId, pending: true });
  }

  if (body.action === "exceptional_exit_review") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede resolver salidas sin firma." }, { status: 403 });
    const requestId = Number(body.requestId);
    const decision = String(body.decision || "");
    const reviewNote = String(body.reviewNote || "").trim();
    if (!requestId || !["APROBADA", "RECHAZADA"].includes(decision) || !reviewNote) return Response.json({ error: "Indica la decisión y una nota administrativa." }, { status: 400 });
    const exceptional = await env.DB.prepare("SELECT * FROM exceptional_exit_requests WHERE id = ? AND status = 'PENDIENTE'").bind(requestId).first<{ id: number; stay_id: number; room_id: number; segment_id: number; requested_by_user_id: number; reason: string }>();
    if (!exceptional) return Response.json({ error: "La solicitud ya fue resuelta o no existe." }, { status: 409 });
    if (exceptional.requested_by_user_id === user?.id) return Response.json({ error: "No puedes aprobar ni rechazar tu propia solicitud." }, { status: 403 });
    if (decision === "APROBADA") {
      const [stay, activeSegment, photoCount] = await Promise.all([
        env.DB.prepare("SELECT id FROM stays WHERE id = ? AND room_id = ? AND status = 'ACTIVA'").bind(exceptional.stay_id, exceptional.room_id).first(),
        env.DB.prepare("SELECT id FROM stay_room_segments WHERE id = ? AND ended_at IS NULL").bind(exceptional.segment_id).first(),
        env.DB.prepare("SELECT COUNT(*) AS total FROM documents WHERE segment_id = ? AND category = 'SALIDA_SIN_FIRMA'").bind(exceptional.segment_id).first<{ total: number }>(),
      ]);
      if (!stay || !activeSegment || !photoCount?.total) return Response.json({ error: "La estadía cambió o ya no conserva fotografías válidas para autorizar." }, { status: 409 });
    }
    await env.DB.batch([
      env.DB.prepare("UPDATE exceptional_exit_requests SET status = ?, reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?, review_note = ? WHERE id = ? AND status = 'PENDIENTE'").bind(decision, user?.id || null, user?.name || "Administración", now, reviewNote, requestId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?)").bind(exceptional.room_id, exceptional.stay_id, decision === "APROBADA" ? "Salida sin firma autorizada" : "Salida sin firma rechazada", reviewNote, decision, user?.name || "Administración", now),
    ]);
    await logAudit(request, user, { action: decision === "APROBADA" ? "SALIDA_SIN_FIRMA_APROBADA" : "SALIDA_SIN_FIRMA_RECHAZADA", entityType: "EXCEPTIONAL_EXIT", entityId: requestId, roomId: exceptional.room_id, newValue: { status: decision }, reason: reviewNote }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "exit_assessment_submit") {
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number }>();
    if (!stay) return Response.json({ error: "No existe una estadía activa." }, { status: 409 });
    const segment = await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stay.id, roomId).first<{ id: number }>();
    if (!segment) return Response.json({ error: "No existe un tramo activo para revisar." }, { status: 409 });
    const [deliveryInspection, returnInspection, deliverySigned, returnSigned, exceptionalExit] = await Promise.all([
      env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind = 'ENTREGA' ORDER BY created_at DESC LIMIT 1").bind(segment.id).first<{ id: number }>(),
      env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind = 'DEVOLUCION' ORDER BY created_at DESC LIMIT 1").bind(segment.id).first<{ id: number }>(),
      env.DB.prepare("SELECT id FROM documents WHERE segment_id = ? AND category = 'ACTA_ENTREGA_FIRMADA' LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT id FROM documents WHERE segment_id = ? AND category = 'ACTA_DEVOLUCION_FIRMADA' LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT id FROM exceptional_exit_requests WHERE segment_id = ? AND status = 'APROBADA' ORDER BY reviewed_at DESC LIMIT 1").bind(segment.id).first(),
    ]);
    if (!deliveryInspection || !returnInspection || !deliverySigned || (!returnSigned && !exceptionalExit)) return Response.json({ error: "Completa ambas actas y carga sus respaldos firmados, o autoriza la salida sin firma, antes de revisar la salida." }, { status: 409 });
    const existing = await env.DB.prepare("SELECT id FROM exit_assessments WHERE segment_id = ? AND return_inspection_id = ? LIMIT 1").bind(segment.id, returnInspection.id).first();
    if (existing) return Response.json({ error: "Esta devolución ya fue revisada." }, { status: 409 });
    const comparison = await compareDeliveryAndReturn(deliveryInspection.id, returnInspection.id);
    const status = comparison.issueCount ? "PENDIENTE" : "SIN_OBSERVACIONES";
    let workOrderId: number | null = null;
    if (comparison.issueCount) {
      const summary = comparison.discrepancies.map((item) => `${item.name}: ${item.returnedCondition.toLowerCase()}`).join(" · ");
      const orderResult = await env.DB.prepare("INSERT INTO work_orders (room_id, stay_id, segment_id, type, title, detail, priority, status, assigned_user_id, due_at, blocks_room, created_by, created_at) VALUES (?, ?, ?, 'DANO', 'Resolver observaciones de devolución', ?, 'ALTA', 'PENDIENTE', NULL, NULL, 1, ?, ?)").bind(roomId, stay.id, segment.id, summary, user?.name || "Recepción", now).run();
      workOrderId = Number(orderResult.meta.last_row_id);
      await env.DB.prepare("INSERT INTO work_order_history (work_order_id, action, from_status, to_status, detail, performed_by, created_at) VALUES (?, 'CREADA_DESDE_SALIDA', NULL, 'PENDIENTE', ?, ?, ?)").bind(workOrderId, summary, user?.name || "Recepción", now).run();
    }
    const result = await env.DB.prepare("INSERT INTO exit_assessments (stay_id, room_id, segment_id, delivery_inspection_id, return_inspection_id, work_order_id, issue_count, missing_count, observed_count, discrepancies, notes, status, submitted_by_user_id, submitted_by_name, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(stay.id, roomId, segment.id, deliveryInspection.id, returnInspection.id, workOrderId, comparison.issueCount, comparison.missingCount, comparison.observedCount, JSON.stringify(comparison.discrepancies), String(body.notes || "").trim(), status, user?.id || 0, user?.name || "Recepción", now).run();
    const assessmentId = Number(result.meta.last_row_id);
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?)").bind(roomId, stay.id, comparison.issueCount ? "Revisión de salida observada" : "Revisión de salida aprobada", comparison.issueCount ? `${comparison.issueCount} diferencia(s) detectada(s)` : "Inventario devuelto sin diferencias nuevas", status, user?.name || "Recepción", now).run();
    await logAudit(request, user, { action: comparison.issueCount ? "SALIDA_REVISION_PENDIENTE" : "SALIDA_REVISION_CONFORME", entityType: "EXIT_ASSESSMENT", entityId: assessmentId, roomId, newValue: comparison, reason: String(body.notes || "").trim() || "Comparación de entrega y devolución" }, now);
    return Response.json({ ok: true, assessmentId, pending: comparison.issueCount > 0 });
  }

  if (body.action === "exit_assessment_review") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede resolver revisiones de salida observadas." }, { status: 403 });
    const assessmentId = Number(body.assessmentId);
    const decision = String(body.decision || "");
    const reviewNote = String(body.reviewNote || "").trim();
    if (!assessmentId || !["APROBADA", "RECHAZADA"].includes(decision) || !reviewNote) return Response.json({ error: "Indica la decisión y una nota administrativa." }, { status: 400 });
    const assessment = await env.DB.prepare("SELECT id, room_id, stay_id, discrepancies FROM exit_assessments WHERE id = ? AND status = 'PENDIENTE'").bind(assessmentId).first<{ id: number; room_id: number; stay_id: number; discrepancies: string }>();
    if (!assessment) return Response.json({ error: "La revisión ya fue resuelta o no existe." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE exit_assessments SET status = ?, reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?, review_note = ? WHERE id = ? AND status = 'PENDIENTE'").bind(decision, user?.id || null, user?.name || "Administración", now, reviewNote, assessmentId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?)").bind(assessment.room_id, assessment.stay_id, decision === "APROBADA" ? "Revisión de salida autorizada" : "Revisión de salida rechazada", reviewNote, decision, user?.name || "Administración", now),
    ]);
    await logAudit(request, user, { action: decision === "APROBADA" ? "SALIDA_REVISION_APROBADA" : "SALIDA_REVISION_RECHAZADA", entityType: "EXIT_ASSESSMENT", entityId: assessmentId, roomId: assessment.room_id, oldValue: JSON.parse(assessment.discrepancies), newValue: { status: decision }, reason: reviewNote }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "exit_assessment_resubmit") {
    const assessmentId = Number(body.assessmentId);
    const notes = String(body.notes || "").trim();
    const assessment = await env.DB.prepare(`SELECT a.id, a.room_id, a.stay_id, a.work_order_id, w.status AS work_order_status
      FROM exit_assessments a LEFT JOIN work_orders w ON w.id = a.work_order_id WHERE a.id = ? AND a.status = 'RECHAZADA'`).bind(assessmentId).first<{ id: number; room_id: number; stay_id: number; work_order_id: number | null; work_order_status: string | null }>();
    if (!assessment) return Response.json({ error: "La revisión no está disponible para reenvío." }, { status: 409 });
    if (assessment.work_order_id && assessment.work_order_status !== "COMPLETADO") return Response.json({ error: "Primero completa la tarea bloqueante asociada a las observaciones." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE exit_assessments SET status = 'PENDIENTE', notes = ?, reviewed_by_user_id = NULL, reviewed_by_name = NULL, reviewed_at = NULL, review_note = NULL, submitted_by_user_id = ?, submitted_by_name = ?, submitted_at = ? WHERE id = ? AND status = 'RECHAZADA'").bind(notes, user?.id || 0, user?.name || "Recepción", now, assessmentId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', 'Revisión de salida reenviada', ?, 'PENDIENTE', ?, ?)").bind(assessment.room_id, assessment.stay_id, notes || "Observaciones corregidas", user?.name || "Recepción", now),
    ]);
    await logAudit(request, user, { action: "SALIDA_REVISION_REENVIADA", entityType: "EXIT_ASSESSMENT", entityId: assessmentId, roomId: assessment.room_id, newValue: { status: "PENDIENTE" }, reason: notes || "Observaciones corregidas" }, now);
    return Response.json({ ok: true, pending: true });
  }

  if (body.action === "primary_transfer_submit") {
    const proposedGuestId = Number(body.proposedGuestId);
    const reason = String(body.reason || "").trim();
    if (!roomId || !proposedGuestId || !reason) return Response.json({ error: "Selecciona al nuevo titular e indica el motivo." }, { status: 400 });
    const stay = await env.DB.prepare("SELECT s.id, s.primary_guest_id, current.full_name AS previous_name FROM stays s JOIN guests current ON current.id = s.primary_guest_id WHERE s.room_id = ? AND s.status = 'ACTIVA'").bind(roomId).first<{ id: number; primary_guest_id: number; previous_name: string }>();
    if (!stay) return Response.json({ error: "No existe una estadía activa." }, { status: 409 });
    if (stay.primary_guest_id === proposedGuestId) return Response.json({ error: "La persona seleccionada ya es titular." }, { status: 409 });
    const candidate = await env.DB.prepare("SELECT g.full_name FROM stay_guests sg JOIN guests g ON g.id = sg.guest_id WHERE sg.stay_id = ? AND sg.guest_id = ? AND sg.left_at IS NULL AND sg.is_primary = 0").bind(stay.id, proposedGuestId).first<{ full_name: string }>();
    if (!candidate) return Response.json({ error: "El nuevo titular debe ser un acompañante activo de esta estadía." }, { status: 409 });
    const pending = await env.DB.prepare("SELECT id FROM primary_guest_transfers WHERE stay_id = ? AND status = 'PENDIENTE' LIMIT 1").bind(stay.id).first();
    if (pending) return Response.json({ error: "Esta estadía ya tiene un traspaso pendiente." }, { status: 409 });
    const status = canConfigure ? "APROBADA" : "PENDIENTE";
    const result = await env.DB.prepare("INSERT INTO primary_guest_transfers (stay_id, room_id, previous_guest_id, proposed_guest_id, reason, status, requested_by_user_id, requested_by_name, requested_at, reviewed_by_user_id, reviewed_by_name, reviewed_at, review_note, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(stay.id, roomId, stay.primary_guest_id, proposedGuestId, reason, status, user?.id || 0, user?.name || "Recepción", now, canConfigure ? user?.id || 0 : null, canConfigure ? user?.name || "Administración" : null, canConfigure ? now : null, canConfigure ? "Aplicación directa por rol administrativo" : null, canConfigure ? now : null).run();
    const transferId = Number(result.meta.last_row_id);
    if (canConfigure) await applyPrimaryGuestTransfer(stay.id, roomId, stay.primary_guest_id, proposedGuestId, stay.previous_name, candidate.full_name, reason, user?.name || "Administración", now);
    await logAudit(request, user, { action: canConfigure ? "TITULARIDAD_APLICADA" : "TITULARIDAD_SOLICITADA", entityType: "PRIMARY_TRANSFER", entityId: transferId, roomId, oldValue: { guestId: stay.primary_guest_id, name: stay.previous_name }, newValue: { guestId: proposedGuestId, name: candidate.full_name, status }, reason }, now);
    return Response.json({ ok: true, transferId, pending: !canConfigure, direct: canConfigure });
  }

  if (body.action === "primary_transfer_review") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede resolver traspasos de titularidad." }, { status: 403 });
    const transferId = Number(body.transferId);
    const decision = String(body.decision || "");
    const reviewNote = String(body.reviewNote || "").trim();
    if (!transferId || !["APROBADA", "RECHAZADA"].includes(decision)) return Response.json({ error: "Decisión inválida." }, { status: 400 });
    if (decision === "RECHAZADA" && !reviewNote) return Response.json({ error: "Indica el motivo del rechazo." }, { status: 400 });
    const transfer = await env.DB.prepare(`SELECT t.*, previous.full_name AS previous_name, proposed.full_name AS proposed_name, s.primary_guest_id, s.status AS stay_status
      FROM primary_guest_transfers t JOIN guests previous ON previous.id = t.previous_guest_id JOIN guests proposed ON proposed.id = t.proposed_guest_id JOIN stays s ON s.id = t.stay_id
      WHERE t.id = ? AND t.status = 'PENDIENTE'`).bind(transferId).first<{ id: number; stay_id: number; room_id: number; previous_guest_id: number; proposed_guest_id: number; previous_name: string; proposed_name: string; primary_guest_id: number; stay_status: string; reason: string }>();
    if (!transfer) return Response.json({ error: "La solicitud ya fue resuelta o no existe." }, { status: 409 });
    if (decision === "APROBADA") {
      if (transfer.stay_status !== "ACTIVA" || transfer.primary_guest_id !== transfer.previous_guest_id) return Response.json({ error: "La titularidad vigente cambió después de la solicitud. Revisa el expediente antes de continuar." }, { status: 409 });
      const activeCandidate = await env.DB.prepare("SELECT id FROM stay_guests WHERE stay_id = ? AND guest_id = ? AND left_at IS NULL").bind(transfer.stay_id, transfer.proposed_guest_id).first();
      if (!activeCandidate) return Response.json({ error: "El titular propuesto ya no ocupa la habitación." }, { status: 409 });
      await applyPrimaryGuestTransfer(transfer.stay_id, transfer.room_id, transfer.previous_guest_id, transfer.proposed_guest_id, transfer.previous_name, transfer.proposed_name, transfer.reason, user?.name || "Administración", now);
    }
    await env.DB.prepare("UPDATE primary_guest_transfers SET status = ?, reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?, review_note = ?, applied_at = ? WHERE id = ? AND status = 'PENDIENTE'")
      .bind(decision, user?.id || null, user?.name || "Administración", now, reviewNote || null, decision === "APROBADA" ? now : null, transferId).run();
    await logAudit(request, user, { action: decision === "APROBADA" ? "TITULARIDAD_APROBADA" : "TITULARIDAD_RECHAZADA", entityType: "PRIMARY_TRANSFER", entityId: transferId, roomId: transfer.room_id, oldValue: { guestId: transfer.previous_guest_id, name: transfer.previous_name }, newValue: { guestId: transfer.proposed_guest_id, name: transfer.proposed_name, status: decision }, reason: reviewNote || transfer.reason }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "occupant_add") {
    const fullName = String(body.fullName || "").trim();
    const ci = normalizeCi(body.ci);
    const phone = String(body.phone || "").trim();
    const isMinor = body.isMinor === true;
    if (!roomId || !fullName) return Response.json({ error: "Indica el nombre del acompañante." }, { status: 400 });
    const stay = await env.DB.prepare("SELECT s.id, r.capacity FROM stays s JOIN rooms r ON r.id = s.room_id WHERE s.room_id = ? AND s.status = 'ACTIVA'").bind(roomId).first<{ id: number; capacity: number }>();
    if (!stay) return Response.json({ error: "La habitación no tiene una estadía activa." }, { status: 409 });
    const activeCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM stay_guests WHERE stay_id = ? AND left_at IS NULL").bind(stay.id).first<{ total: number }>();
    const overCapacity = Number(activeCount?.total || 0) + 1 > stay.capacity;
    const overrideReason = String(body.capacityOverrideReason || "").trim();
    if (overCapacity && body.capacityOverride !== true) return Response.json({ error: "La habitación excedería su capacidad. Se requiere autorización administrativa." }, { status: 409 });
    if (overCapacity && !canConfigure) return Response.json({ error: "Solo propietario o administrador puede autorizar la sobrecapacidad." }, { status: 403 });
    if (overCapacity && !overrideReason) return Response.json({ error: "Indica el motivo de la autorización de sobrecapacidad." }, { status: 400 });
    let guestId: number;
    const existing = ci ? await env.DB.prepare("SELECT id FROM guests WHERE upper(replace(replace(replace(ci, ' ', ''), '-', ''), '.', '')) = ? LIMIT 1").bind(ci).first<{ id: number }>() : null;
    if (existing) {
      const activeElsewhere = await env.DB.prepare("SELECT sg.id FROM stay_guests sg JOIN stays s ON s.id = sg.stay_id WHERE sg.guest_id = ? AND sg.left_at IS NULL AND s.status = 'ACTIVA' LIMIT 1").bind(existing.id).first();
      if (activeElsewhere) return Response.json({ error: "Esta persona ya figura en una estadía activa." }, { status: 409 });
      guestId = existing.id;
      await env.DB.prepare("UPDATE guests SET full_name = ?, phone = COALESCE(NULLIF(?, ''), phone), is_minor = ?, identification_pending = 0, updated_at = ? WHERE id = ?").bind(fullName, phone, isMinor ? 1 : 0, now, guestId).run();
    } else {
      const result = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, identification_pending, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(fullName, ci || null, phone || null, isMinor ? 1 : 0, ci ? 0 : 1, now, now).run();
      guestId = Number(result.meta.last_row_id);
    }
    const result = await env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary, joined_at, added_by) VALUES (?, ?, 0, ?, ?)").bind(stay.id, guestId, now, user?.name || "Recepción").run();
    const occupantId = Number(result.meta.last_row_id);
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'OCUPANTE', 'Acompañante añadido', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, fullName + (overCapacity ? " · Sobrecapacidad autorizada" : ""), user?.name || "Recepción", now).run();
    await logAudit(request, user, { action: "ACOMPANANTE_AGREGADO", entityType: "STAY_OCCUPANT", entityId: occupantId, roomId, newValue: { fullName, ci: ci || null, phone: phone || null, isMinor, joinedAt: now }, reason: overCapacity ? overrideReason : "Alta durante estadía" }, now);
    return Response.json({ ok: true, occupantId });
  }

  if (body.action === "occupant_remove") {
    const occupantId = Number(body.occupantId);
    const reason = String(body.reason || "").trim();
    if (!occupantId || !reason) return Response.json({ error: "Indica el acompañante y el motivo de retiro." }, { status: 400 });
    const occupant = await env.DB.prepare("SELECT sg.id, sg.stay_id, sg.guest_id, sg.is_primary, g.full_name FROM stay_guests sg JOIN guests g ON g.id = sg.guest_id JOIN stays s ON s.id = sg.stay_id WHERE sg.id = ? AND s.room_id = ? AND s.status = 'ACTIVA' AND sg.left_at IS NULL").bind(occupantId, roomId).first<{ id: number; stay_id: number; guest_id: number; is_primary: number; full_name: string }>();
    if (!occupant) return Response.json({ error: "El acompañante ya fue retirado o no pertenece a esta estadía." }, { status: 409 });
    if (occupant.is_primary) return Response.json({ error: "El titular no puede retirarse desde acompañantes. Utiliza el flujo de cambio de titularidad." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE stay_guests SET left_at = ?, removed_by = ?, removal_reason = ? WHERE id = ? AND left_at IS NULL").bind(now, user?.name || "Recepción", reason, occupantId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'OCUPANTE', 'Acompañante retirado', ?, 'COMPLETADO', ?, ?)").bind(roomId, occupant.stay_id, occupant.full_name + " · " + reason, user?.name || "Recepción", now),
    ]);
    await logAudit(request, user, { action: "ACOMPANANTE_RETIRADO", entityType: "STAY_OCCUPANT", entityId: occupantId, roomId, oldValue: { fullName: occupant.full_name, active: true }, newValue: { active: false, leftAt: now }, reason }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "correction_submit") {
    const fieldName = String(body.fieldName || "");
    const field = correctionFields[fieldName];
    const reason = String(body.reason || "").trim();
    let proposedValue = String(body.proposedValue ?? "").trim();
    if (!roomId || !field || !reason) return Response.json({ error: "Selecciona el dato e indica el motivo de la corrección." }, { status: 400 });
    const stay = await env.DB.prepare("SELECT id, primary_guest_id, check_in, stay_type, expected_check_out FROM stays WHERE room_id = ? AND status = 'ACTIVA' ORDER BY check_in DESC LIMIT 1").bind(roomId).first<{ id: number; primary_guest_id: number; check_in: string; stay_type: string; expected_check_out: string | null }>();
    if (!stay) return Response.json({ error: "La habitación no tiene una estadía activa para corregir." }, { status: 409 });
    const entityId = field.entityType === "GUEST" ? stay.primary_guest_id : stay.id;
    if (fieldName === "full_name" && !proposedValue) return Response.json({ error: "El nombre del huésped no puede quedar vacío." }, { status: 400 });
    if (fieldName === "ci") {
      proposedValue = normalizeCi(proposedValue);
      if (!proposedValue) return Response.json({ error: "Indica un CI válido." }, { status: 400 });
      const duplicate = await env.DB.prepare("SELECT id FROM guests WHERE upper(replace(replace(replace(ci, ' ', ''), '-', ''), '.', '')) = ? AND id != ?").bind(proposedValue, entityId).first();
      if (duplicate) return Response.json({ error: "Ese CI ya pertenece a otro huésped." }, { status: 409 });
    }
    if (fieldName === "stay_type" && !["DIA", "SEMANA", "MES", "ARRENDAMIENTO"].includes(proposedValue)) return Response.json({ error: "Modalidad de estadía inválida." }, { status: 400 });
    if (fieldName === "stay_type" && proposedValue !== "ARRENDAMIENTO" && !stay.expected_check_out) return Response.json({ error: "Primero registra una fecha prevista de salida para esa modalidad." }, { status: 400 });
    if (fieldName === "expected_check_out" && proposedValue && !/^\d{4}-\d{2}-\d{2}$/.test(proposedValue)) return Response.json({ error: "Fecha prevista inválida." }, { status: 400 });
    if (fieldName === "expected_check_out" && !proposedValue && stay.stay_type !== "ARRENDAMIENTO") return Response.json({ error: "La fecha prevista es obligatoria para estadías por día, semana o mes." }, { status: 400 });
    const oldValue = await correctionValue(field.entityType, entityId, fieldName);
    if (oldValue === null) return Response.json({ error: "No se encontró el registro a corregir." }, { status: 404 });
    if (String(oldValue) === proposedValue) return Response.json({ error: "El valor propuesto es igual al valor actual." }, { status: 400 });
    const pending = await env.DB.prepare("SELECT id FROM change_requests WHERE entity_type = ? AND entity_id = ? AND field_name = ? AND status = 'PENDIENTE' LIMIT 1").bind(field.entityType, entityId, fieldName).first();
    if (pending) return Response.json({ error: "Ya existe una solicitud pendiente para este dato." }, { status: 409 });
    const segment = await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stay.id, roomId).first<{ id: number }>();
    const actGenerated = segment ? await env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind IN ('ENTREGA', 'DEVOLUCION') LIMIT 1").bind(segment.id).first() : null;
    const withinWindow = Date.now() - new Date(stay.check_in).getTime() <= 30 * 60 * 1000;
    const direct = canConfigure || (user?.role === "RECEPCION" && withinWindow && !actGenerated);
    if (direct) {
      await applyCorrection(field.entityType, entityId, fieldName, proposedValue, now);
      const result = await env.DB.prepare("INSERT INTO change_requests (room_id, entity_type, entity_id, field_name, old_value, proposed_value, reason, status, application_mode, requested_by_user_id, requested_by_name, requested_at, reviewed_by_user_id, reviewed_by_name, reviewed_at, review_note, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'APROBADA', 'DIRECTA', ?, ?, ?, ?, ?, ?, ?, ?)").bind(roomId, field.entityType, entityId, fieldName, String(oldValue), proposedValue, reason, user?.id || 0, user?.name || "Usuario", now, canConfigure ? user?.id || null : null, canConfigure ? user?.name || null : null, canConfigure ? now : null, canConfigure ? "Corrección administrativa directa" : "Corrección dentro de los primeros 30 minutos", now).run();
      await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CORRECCION', ?, ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, "Corrección aplicada: " + field.label, reason, user?.name || "Usuario", now).run();
      const requestId = Number(result.meta.last_row_id);
      await logAudit(request, user, { action: "CORRECCION_DIRECTA", entityType: field.entityType, entityId, roomId, oldValue, newValue: proposedValue, reason, approvalRequestId: requestId }, now);
      return Response.json({ ok: true, direct: true, requestId });
    }
    const result = await env.DB.prepare("INSERT INTO change_requests (room_id, entity_type, entity_id, field_name, old_value, proposed_value, reason, status, application_mode, requested_by_user_id, requested_by_name, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', 'APROBACION', ?, ?, ?)").bind(roomId, field.entityType, entityId, fieldName, String(oldValue), proposedValue, reason, user?.id || 0, user?.name || "Recepción", now).run();
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SOLICITUD', ?, ?, 'PENDIENTE', ?, ?)").bind(roomId, stay.id, "Corrección pendiente: " + field.label, reason, user?.name || "Recepción", now).run();
    const requestId = Number(result.meta.last_row_id);
    await logAudit(request, user, { action: "CORRECCION_SOLICITADA", entityType: field.entityType, entityId, roomId, oldValue, newValue: proposedValue, reason, approvalRequestId: requestId }, now);
    return Response.json({ ok: true, pending: true, requestId });
  }

  if (body.action === "correction_review") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede resolver solicitudes." }, { status: 403 });
    const requestId = Number(body.requestId);
    const decision = body.decision === "APROBADA" ? "APROBADA" : body.decision === "RECHAZADA" ? "RECHAZADA" : "";
    const reviewNote = String(body.reviewNote || "").trim();
    if (!requestId || !decision) return Response.json({ error: "Solicitud o decisión inválida." }, { status: 400 });
    if (decision === "RECHAZADA" && !reviewNote) return Response.json({ error: "Indica el motivo del rechazo." }, { status: 400 });
    const change = await env.DB.prepare("SELECT * FROM change_requests WHERE id = ? AND status = 'PENDIENTE'").bind(requestId).first<{ id: number; room_id: number; entity_type: "GUEST" | "STAY"; entity_id: number; field_name: string; old_value: string | null; proposed_value: string | null }>();
    if (!change) return Response.json({ error: "La solicitud ya fue resuelta o no existe." }, { status: 409 });
    const field = correctionFields[change.field_name];
    if (!field || field.entityType !== change.entity_type) return Response.json({ error: "La solicitud contiene un campo inválido." }, { status: 409 });
    if (decision === "APROBADA") {
      const currentValue = await correctionValue(change.entity_type, change.entity_id, change.field_name);
      if (String(currentValue ?? "") !== String(change.old_value ?? "")) return Response.json({ error: "El dato original cambió después de la solicitud. Rechaza esta solicitud y registra una nueva." }, { status: 409 });
      await applyCorrection(change.entity_type, change.entity_id, change.field_name, String(change.proposed_value ?? ""), now);
    }
    await env.DB.prepare("UPDATE change_requests SET status = ?, reviewed_by_user_id = ?, reviewed_by_name = ?, reviewed_at = ?, review_note = ?, applied_at = ? WHERE id = ? AND status = 'PENDIENTE'").bind(decision, user?.id || null, user?.name || "Administración", now, reviewNote || (decision === "APROBADA" ? "Solicitud aprobada" : ""), decision === "APROBADA" ? now : null, requestId).run();
    const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA' LIMIT 1").bind(change.room_id).first<{ id: number }>();
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'APROBACION', ?, ?, ?, ?, ?)").bind(change.room_id, activeStay?.id || null, (decision === "APROBADA" ? "Corrección aprobada: " : "Corrección rechazada: ") + field.label, reviewNote || "Solicitud aprobada", decision, user?.name || "Administración", now).run();
    await logAudit(request, user, { action: decision === "APROBADA" ? "CORRECCION_APROBADA" : "CORRECCION_RECHAZADA", entityType: change.entity_type, entityId: change.entity_id, roomId: change.room_id, oldValue: change.old_value, newValue: change.proposed_value, reason: reviewNote || "Solicitud aprobada", approvalRequestId: requestId }, now);
    return Response.json({ ok: true, decision });
  }

  if (body.action === "work_order_create") {
    const title = String(body.title || "").trim();
    const detail = String(body.detail || "").trim();
    const type = ["LIMPIEZA", "MANTENIMIENTO", "REPARACION", "MUEBLES", "DANO", "OTRO"].includes(String(body.type)) ? String(body.type) : "OTRO";
    const priority = ["BAJA", "MEDIA", "ALTA", "URGENTE"].includes(String(body.priority)) ? String(body.priority) : "MEDIA";
    const assignedUserId = Number(body.assignedUserId) || null;
    if (!roomId || !title) return Response.json({ error: "Selecciona una habitación e indica el trabajo." }, { status: 400 });
    const room = await env.DB.prepare("SELECT number, status, active FROM rooms WHERE id = ?").bind(roomId).first<{ number: string; status: string; active: number }>();
    if (!room?.active) return Response.json({ error: "La habitación no está activa." }, { status: 409 });
    if (assignedUserId) {
      const assignee = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND active = 1").bind(assignedUserId).first();
      if (!assignee) return Response.json({ error: "El responsable seleccionado no tiene acceso activo." }, { status: 409 });
    }
    const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA' ORDER BY check_in DESC LIMIT 1").bind(roomId).first<{ id: number }>();
    const segment = activeStay ? await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(activeStay.id, roomId).first<{ id: number }>() : null;
    const blocksRoom = body.blocksRoom === true ? 1 : 0;
    const result = await env.DB.prepare("INSERT INTO work_orders (room_id, stay_id, segment_id, type, title, detail, priority, status, assigned_user_id, due_at, blocks_room, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?, ?)").bind(roomId, activeStay?.id || null, segment?.id || null, type, title, detail, priority, assignedUserId, body.dueAt || null, blocksRoom, user?.name || "Recepción", now).run();
    const workOrderId = Number(result.meta.last_row_id);
    const statements = [
      env.DB.prepare("INSERT INTO work_order_history (work_order_id, action, from_status, to_status, detail, performed_by, created_at) VALUES (?, 'CREADA', NULL, 'PENDIENTE', ?, ?, ?)").bind(workOrderId, detail || title, user?.name || "Recepción", now),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?, ?)").bind(roomId, activeStay?.id || null, type, "Tarea: " + title, priority + (assignedUserId ? " · Responsable asignado" : " · Sin responsable"), user?.name || "Recepción", now),
    ];
    if (blocksRoom && room.status === "DISPONIBLE") statements.push(env.DB.prepare("UPDATE rooms SET status = 'MANTENIMIENTO' WHERE id = ?").bind(roomId));
    await env.DB.batch(statements);
    return Response.json({ ok: true, workOrderId });
  }

  if (body.action === "work_order_assign") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede reasignar responsables." }, { status: 403 });
    const workOrderId = Number(body.workOrderId);
    const assignedUserId = Number(body.assignedUserId) || null;
    const order = await env.DB.prepare("SELECT status, assigned_user_id FROM work_orders WHERE id = ?").bind(workOrderId).first<{ status: string; assigned_user_id: number | null }>();
    if (!order) return Response.json({ error: "La tarea no existe." }, { status: 404 });
    if (["COMPLETADO", "CANCELADO"].includes(order.status)) return Response.json({ error: "No se puede reasignar una tarea cerrada." }, { status: 409 });
    let assignedName = "Sin responsable";
    if (assignedUserId) {
      const assignee = await env.DB.prepare("SELECT name FROM users WHERE id = ? AND active = 1").bind(assignedUserId).first<{ name: string }>();
      if (!assignee) return Response.json({ error: "El responsable seleccionado no tiene acceso activo." }, { status: 409 });
      assignedName = assignee.name;
    }
    await env.DB.batch([
      env.DB.prepare("UPDATE work_orders SET assigned_user_id = ? WHERE id = ?").bind(assignedUserId, workOrderId),
      env.DB.prepare("INSERT INTO work_order_history (work_order_id, action, from_status, to_status, detail, performed_by, created_at) VALUES (?, 'REASIGNADA', ?, ?, ?, ?, ?)").bind(workOrderId, order.status, order.status, "Responsable: " + assignedName, user?.name || "Administración", now),
    ]);
    return Response.json({ ok: true });
  }

  if (body.action === "work_order_update") {
    const workOrderId = Number(body.workOrderId);
    const nextStatus = String(body.status || "");
    const order = await env.DB.prepare("SELECT id, room_id, stay_id, type, title, status, assigned_user_id, blocks_room FROM work_orders WHERE id = ?").bind(workOrderId).first<{ id: number; room_id: number; stay_id: number | null; type: string; title: string; status: string; assigned_user_id: number | null; blocks_room: number }>();
    if (!order) return Response.json({ error: "La tarea no existe." }, { status: 404 });
    const transitions: Record<string, string[]> = { PENDIENTE: ["EN_PROCESO", "CANCELADO"], EN_PROCESO: ["COMPLETADO", "CANCELADO"] };
    if (!transitions[order.status]?.includes(nextStatus)) return Response.json({ error: "Ese cambio de estado no está permitido." }, { status: 409 });
    if (nextStatus === "CANCELADO" && !canConfigure) return Response.json({ error: "Solo administración puede cancelar tareas." }, { status: 403 });
    if (nextStatus === "CANCELADO" && !String(body.reason || "").trim()) return Response.json({ error: "Indica el motivo de cancelación." }, { status: 400 });
    if (!canConfigure && order.assigned_user_id && order.assigned_user_id !== user?.id) return Response.json({ error: "Esta tarea está asignada a otro trabajador." }, { status: 403 });
    if (nextStatus === "COMPLETADO" && ["MANTENIMIENTO", "REPARACION", "DANO"].includes(order.type)) {
      const evidence = await env.DB.prepare("SELECT category, COUNT(*) AS total FROM documents WHERE work_order_id = ? AND category IN ('TRABAJO_ANTES', 'TRABAJO_DESPUES') GROUP BY category").bind(workOrderId).all<{ category: string; total: number }>();
      const categories = new Set(evidence.results.filter((item) => item.total > 0).map((item) => item.category));
      if (!categories.has("TRABAJO_ANTES") || !categories.has("TRABAJO_DESPUES")) return Response.json({ error: "Para cerrar reparaciones, daños o mantenimiento carga evidencia de antes y después." }, { status: 409 });
    }
    const actor = user?.name || "Recepción";
    const assignments = nextStatus === "EN_PROCESO"
      ? "status = ?, assigned_user_id = COALESCE(assigned_user_id, ?), started_at = ?, started_by = ?"
      : nextStatus === "COMPLETADO"
        ? "status = ?, completed_at = ?, completed_by = ?"
        : "status = ?, cancelled_at = ?, cancelled_by = ?, cancellation_reason = ?";
    const update = nextStatus === "EN_PROCESO"
      ? env.DB.prepare("UPDATE work_orders SET " + assignments + " WHERE id = ?").bind(nextStatus, user?.id || null, now, actor, workOrderId)
      : nextStatus === "COMPLETADO"
        ? env.DB.prepare("UPDATE work_orders SET " + assignments + " WHERE id = ?").bind(nextStatus, now, actor, workOrderId)
        : env.DB.prepare("UPDATE work_orders SET " + assignments + " WHERE id = ?").bind(nextStatus, now, actor, String(body.reason).trim(), workOrderId);
    await env.DB.batch([
      update,
      env.DB.prepare("INSERT INTO work_order_history (work_order_id, action, from_status, to_status, detail, performed_by, created_at) VALUES (?, 'ESTADO_CAMBIADO', ?, ?, ?, ?, ?)").bind(workOrderId, order.status, nextStatus, String(body.reason || body.detail || "").trim(), actor, now),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(order.room_id, order.stay_id, order.type, "Tarea " + (nextStatus === "COMPLETADO" ? "completada" : nextStatus === "CANCELADO" ? "cancelada" : "iniciada") + ": " + order.title, String(body.reason || "Actualización de orden de trabajo"), nextStatus, actor, now),
    ]);
    if ((nextStatus === "COMPLETADO" || nextStatus === "CANCELADO") && order.blocks_room) {
      const remaining = await env.DB.prepare("SELECT id FROM work_orders WHERE room_id = ? AND blocks_room = 1 AND status IN ('PENDIENTE', 'EN_PROCESO') LIMIT 1").bind(order.room_id).first();
      const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA' LIMIT 1").bind(order.room_id).first();
      const turnover = await env.DB.prepare("SELECT id FROM room_turnovers WHERE room_id = ? AND status != 'COMPLETADO' LIMIT 1").bind(order.room_id).first();
      if (!remaining && !activeStay && !turnover) await env.DB.prepare("UPDATE rooms SET status = 'DISPONIBLE' WHERE id = ? AND status = 'MANTENIMIENTO'").bind(order.room_id).run();
    }
    return Response.json({ ok: true });
  }

  if (body.action === "floor_create") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede crear pisos." }, { status: 403 });
    const name = String(body.name || "").trim();
    if (!name) return Response.json({ error: "Indica el nombre del piso." }, { status: 400 });
    const duplicate = await env.DB.prepare("SELECT id FROM floors WHERE lower(name) = lower(?)").bind(name).first();
    if (duplicate) return Response.json({ error: "Ya existe un piso con ese nombre." }, { status: 409 });
    const maxPosition = await env.DB.prepare("SELECT COALESCE(MAX(position), 0) AS value FROM floors").first<{ value: number }>();
    await env.DB.prepare("INSERT INTO floors (name, position, active) VALUES (?, ?, 1)").bind(name, Number(body.position) || Number(maxPosition?.value || 0) + 1).run();
    return Response.json({ ok: true });
  }

  if (body.action === "floor_update") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede editar pisos." }, { status: 403 });
    const floorId = Number(body.floorId);
    const name = String(body.name || "").trim();
    if (!floorId || !name) return Response.json({ error: "Completa los datos del piso." }, { status: 400 });
    const duplicate = await env.DB.prepare("SELECT id FROM floors WHERE lower(name) = lower(?) AND id != ?").bind(name, floorId).first();
    if (duplicate) return Response.json({ error: "Ya existe un piso con ese nombre." }, { status: 409 });
    await env.DB.prepare("UPDATE floors SET name = ?, position = ? WHERE id = ?").bind(name, Number(body.position) || 1, floorId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "floor_toggle") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede activar o desactivar pisos." }, { status: 403 });
    const floorId = Number(body.floorId);
    const active = body.active !== false;
    if (!active && !String(body.reason || "").trim()) return Response.json({ error: "Indica el motivo de desactivación." }, { status: 400 });
    if (!active) {
      const activeRooms = await env.DB.prepare("SELECT COUNT(*) AS total FROM rooms WHERE floor_id = ? AND active = 1").bind(floorId).first<{ total: number }>();
      if (activeRooms?.total) return Response.json({ error: "Primero mueve o desactiva las habitaciones activas de este piso." }, { status: 409 });
    }
    await env.DB.prepare("UPDATE floors SET active = ? WHERE id = ?").bind(active ? 1 : 0, floorId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "room_create") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede crear habitaciones." }, { status: 403 });
    const number = String(body.number || "").trim();
    const floorId = Number(body.floorId);
    if (!number || !floorId) return Response.json({ error: "Indica el número y el piso." }, { status: 400 });
    const floor = await env.DB.prepare("SELECT active FROM floors WHERE id = ?").bind(floorId).first<{ active: number }>();
    if (!floor?.active) return Response.json({ error: "Selecciona un piso activo." }, { status: 409 });
    const duplicate = await env.DB.prepare("SELECT id FROM rooms WHERE lower(number) = lower(?)").bind(number).first();
    if (duplicate) return Response.json({ error: "Ese número o nombre de habitación ya existe." }, { status: 409 });
    const result = await env.DB.prepare("INSERT INTO rooms (floor_id, number, type, capacity, status, notes, active) VALUES (?, ?, ?, ?, 'DISPONIBLE', ?, 1)").bind(floorId, number, String(body.type || "Estándar").trim(), Number(body.capacity) || 1, String(body.notes || "")).run();
    const newRoomId = Number(result.meta.last_row_id);
    const inventoryMode = String(body.inventoryMode || "BASE");
    const inventoryStatements: D1PreparedStatement[] = [];
    if (inventoryMode === "COPY") {
      const sourceItems = await env.DB.prepare("SELECT name, quantity, item_type, notes FROM inventory_items WHERE room_id = ?").bind(Number(body.sourceRoomId)).all<{ name: string; quantity: number; item_type: string; notes: string }>();
      sourceItems.results.forEach((item) => inventoryStatements.push(env.DB.prepare("INSERT INTO inventory_items (room_id, name, quantity, item_type, notes) VALUES (?, ?, ?, ?, ?)").bind(newRoomId, item.name, item.quantity, item.item_type, item.notes)));
    } else if (inventoryMode === "BASE") {
      const baseItems = [["Cama", 1, "PERMANENTE"], ["Almohada", 2, "REUTILIZABLE"], ["Juego de sábanas", 1, "REUTILIZABLE"], ["Cubrecama", 1, "REUTILIZABLE"], ["Mesa", 1, "PERMANENTE"], ["Cómoda", 1, "PERMANENTE"], ["Silla", 1, "PERMANENTE"]] as const;
      baseItems.forEach(([name, quantity, itemType]) => inventoryStatements.push(env.DB.prepare("INSERT INTO inventory_items (room_id, name, quantity, item_type, notes) VALUES (?, ?, ?, ?, '')").bind(newRoomId, name, quantity, itemType)));
    }
    if (inventoryStatements.length) await env.DB.batch(inventoryStatements);
    return Response.json({ ok: true, roomId: newRoomId });
  }

  if (body.action === "room_toggle") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede activar o desactivar habitaciones." }, { status: 403 });
    const active = body.active !== false;
    if (!active && !String(body.reason || "").trim()) return Response.json({ error: "Indica el motivo de desactivación." }, { status: 400 });
    const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first();
    if (activeStay) return Response.json({ error: "No se puede modificar una habitación ocupada." }, { status: 409 });
    await env.DB.prepare("UPDATE rooms SET active = ?, status = ? WHERE id = ?").bind(active ? 1 : 0, active ? "DISPONIBLE" : "FUERA_SERVICIO", roomId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "guest_lookup") {
    const ci = normalizeCi(body.ci);
    if (!ci) return Response.json({ error: "Escribe un CI para buscar." }, { status: 400 });
    const guest = await env.DB.prepare(`SELECT id, full_name, ci, phone, identification_pending,
      (SELECT COUNT(*) FROM stays WHERE primary_guest_id = guests.id) AS stay_count,
      (SELECT room_id FROM stays WHERE primary_guest_id = guests.id AND status = 'ACTIVA' LIMIT 1) AS active_room_id
      FROM guests WHERE upper(replace(replace(replace(ci, ' ', ''), '-', ''), '.', '')) = ? LIMIT 1`).bind(ci).first();
    return Response.json({ guest: guest || null });
  }

  if (body.action === "checkin") {
    const primary = body.primary as { fullName?: string; ci?: string; phone?: string };
    if (!roomId || !primary?.fullName?.trim()) return Response.json({ error: "Falta el huésped titular." }, { status: 400 });
    const stayType = ["DIA", "SEMANA", "MES", "ARRENDAMIENTO"].includes(String(body.stayType)) ? String(body.stayType) : "DIA";
    if (stayType !== "ARRENDAMIENTO" && !body.expectedCheckOut) return Response.json({ error: "Indica la fecha prevista de salida." }, { status: 400 });
    const room = await env.DB.prepare("SELECT status, capacity, active FROM rooms WHERE id = ?").bind(roomId).first<{ status: string; capacity: number; active: number }>();
    if (room?.status !== "DISPONIBLE" || !room.active) return Response.json({ error: "La habitación ya no está disponible." }, { status: 409 });
    const companions = ((body.companions || []) as Array<{ fullName?: string; ci?: string; phone?: string; isMinor?: boolean }>).filter((companion) => companion.fullName?.trim());
    const guestCount = 1 + companions.length;
    const overCapacity = guestCount > room.capacity;
    if (overCapacity && body.capacityOverride !== true) return Response.json({ error: `La habitación admite ${room.capacity} personas y se intentan registrar ${guestCount}. Se requiere autorización administrativa.`, requiresCapacityApproval: true }, { status: 409 });
    if (overCapacity && !canConfigure) return Response.json({ error: "Solo el propietario o administrador puede autorizar una sobrecapacidad." }, { status: 403 });
    const overrideReason = String(body.capacityOverrideReason || "").trim();
    if (overCapacity && !overrideReason) return Response.json({ error: "Indica el motivo de la autorización de sobrecapacidad." }, { status: 400 });

    const primaryCi = normalizeCi(primary.ci);
    const identificationPending = body.identificationPending === true || !primaryCi;
    if (!primaryCi && !identificationPending) return Response.json({ error: "Registra el CI o marca la identificación como pendiente." }, { status: 400 });
    const payloadCis = [primaryCi, ...companions.map((companion) => normalizeCi(companion.ci))].filter(Boolean);
    if (new Set(payloadCis).size !== payloadCis.length) return Response.json({ error: "El mismo CI aparece más de una vez entre los ocupantes." }, { status: 409 });

    let primaryId: number;
    const existingPrimary = primaryCi ? await env.DB.prepare("SELECT id FROM guests WHERE upper(replace(replace(replace(ci, ' ', ''), '-', ''), '.', '')) = ? LIMIT 1").bind(primaryCi).first<{ id: number }>() : null;
    if (existingPrimary) {
      const activeStay = await env.DB.prepare("SELECT sg.id FROM stay_guests sg JOIN stays s ON s.id = sg.stay_id WHERE sg.guest_id = ? AND sg.left_at IS NULL AND s.status = 'ACTIVA' LIMIT 1").bind(existingPrimary.id).first();
      if (activeStay) return Response.json({ error: "Este huésped ya figura como titular de una estadía activa." }, { status: 409 });
      primaryId = existingPrimary.id;
      await env.DB.prepare("UPDATE guests SET full_name = ?, phone = COALESCE(NULLIF(?, ''), phone), ci = ?, identification_pending = 0, updated_at = ? WHERE id = ?").bind(primary.fullName.trim(), primary.phone || "", primaryCi, now, primaryId).run();
    } else {
      const guestResult = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, identification_pending, updated_at, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)").bind(primary.fullName.trim(), primaryCi || null, primary.phone || null, identificationPending ? 1 : 0, now, now).run();
      primaryId = Number(guestResult.meta.last_row_id);
    }

    const stayResult = await env.DB.prepare("INSERT INTO stays (room_id, primary_guest_id, stay_type, check_in, expected_check_out, status, notes, capacity_override, capacity_override_reason, capacity_authorized_by) VALUES (?, ?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?)").bind(roomId, primaryId, stayType, now, body.expectedCheckOut || null, body.notes || "", overCapacity ? 1 : 0, overCapacity ? overrideReason : null, overCapacity ? user?.name || "Administración" : null).run();
    const stayId = Number(stayResult.meta.last_row_id);
    const companionStatements = [env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary, joined_at, added_by) VALUES (?, ?, 1, ?, ?)").bind(stayId, primaryId, now, user?.name || "Recepción")];
    for (const companion of companions) {
      const companionCi = normalizeCi(companion.ci);
      const existing = companionCi ? await env.DB.prepare("SELECT id FROM guests WHERE upper(replace(replace(replace(ci, ' ', ''), '-', ''), '.', '')) = ? LIMIT 1").bind(companionCi).first<{ id: number }>() : null;
      let guestId = existing?.id;
      if (guestId) {
        const activeMembership = await env.DB.prepare("SELECT sg.id FROM stay_guests sg JOIN stays s ON s.id = sg.stay_id WHERE sg.guest_id = ? AND sg.left_at IS NULL AND s.status = 'ACTIVA' LIMIT 1").bind(guestId).first();
        if (activeMembership) return Response.json({ error: "Uno de los acompañantes ya figura en otra estadía activa." }, { status: 409 });
        await env.DB.prepare("UPDATE guests SET full_name = ?, phone = COALESCE(NULLIF(?, ''), phone), ci = ?, identification_pending = 0, is_minor = ?, updated_at = ? WHERE id = ?").bind(companion.fullName!.trim(), companion.phone || "", companionCi, companion.isMinor ? 1 : 0, now, guestId).run();
      } else {
        const result = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, identification_pending, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(companion.fullName!.trim(), companionCi || null, companion.phone || null, companion.isMinor ? 1 : 0, companionCi ? 0 : 1, now, now).run();
        guestId = Number(result.meta.last_row_id);
      }
      companionStatements.push(env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary, joined_at, added_by) VALUES (?, ?, 0, ?, ?)").bind(stayId, guestId, now, user?.name || "Recepción"));
    }
    await env.DB.batch([
      ...companionStatements,
      env.DB.prepare("INSERT INTO stay_room_segments (stay_id, room_id, sequence, started_at, start_reason, created_by) VALUES (?, ?, 1, ?, 'INGRESO', ?)").bind(stayId, roomId, now, user?.name || "Recepción"),
      env.DB.prepare("UPDATE rooms SET status = 'OCUPADA' WHERE id = ?").bind(roomId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INGRESO', 'Ingreso de huésped', ?, 'COMPLETADO', ?, ?)").bind(roomId, stayId, `Titular: ${primary.fullName}${identificationPending ? ' · Identificación pendiente' : ''}${overCapacity ? ' · Sobrecapacidad autorizada' : ''}`, user?.name || "Usuario", now),
    ]);
    return Response.json({ ok: true, stayId });
  }

  if (body.action === "event") {
    if (!roomId || !body.title) return Response.json({ error: "Completa el evento." }, { status: 400 });
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(roomId, body.stayId || null, body.type || "OTRO", body.title, body.detail || "", body.status || "PENDIENTE", user?.name || "Usuario", now).run();
    return Response.json({ ok: true });
  }

  if (body.action === "checkout") {
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number }>();
    if (!stay) return Response.json({ error: "No existe una estadía activa." }, { status: 404 });
    const pendingSales = await env.DB.prepare(`SELECT COUNT(*) AS sale_count,
      COALESCE(SUM(MAX(0, sale.total_cents - COALESCE((SELECT SUM(payment.amount_cents) FROM sale_payments payment WHERE payment.sale_id = sale.id), 0) - COALESCE((SELECT SUM(ret.refund_amount_cents) FROM sale_returns ret WHERE ret.sale_id = sale.id), 0))), 0) AS pending_cents
      FROM sales sale WHERE sale.stay_id = ? AND sale.status IN ('PENDIENTE', 'CORTESIA_PENDIENTE')`).bind(stay.id).first<{ sale_count: number; pending_cents: number }>();
    if (Number(pendingSales?.sale_count || 0) > 0) return Response.json({ error: `La estadía tiene ${Number(pendingSales?.sale_count || 0)} venta(s) pendiente(s) por Bs ${(Number(pendingSales?.pending_cents || 0) / 100).toFixed(2)}. Resuélvelas en Ventas antes de registrar la salida.` }, { status: 409 });
    const segment = await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stay.id, roomId).first<{ id: number }>();
    if (!segment) return Response.json({ error: "La estadía no tiene un segmento activo para esta habitación." }, { status: 409 });
    const [deliveryInspection, returnInspection, deliverySigned, returnSigned, exceptionalExit] = await Promise.all([
      env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind = 'ENTREGA' ORDER BY created_at DESC LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind = 'DEVOLUCION' ORDER BY created_at DESC LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT id FROM documents WHERE segment_id = ? AND category = 'ACTA_ENTREGA_FIRMADA' LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT id FROM documents WHERE segment_id = ? AND category = 'ACTA_DEVOLUCION_FIRMADA' LIMIT 1").bind(segment.id).first(),
      env.DB.prepare("SELECT id FROM exceptional_exit_requests WHERE segment_id = ? AND status = 'APROBADA' ORDER BY reviewed_at DESC LIMIT 1").bind(segment.id).first(),
    ]);
    if (!deliveryInspection) return Response.json({ error: "Primero completa el acta de entrega." }, { status: 409 });
    if (!deliverySigned) return Response.json({ error: "Carga la fotografía del acta de entrega firmada." }, { status: 409 });
    if (!returnInspection) return Response.json({ error: "Primero completa el acta de devolución." }, { status: 409 });
    if (!returnSigned && !exceptionalExit) return Response.json({ error: "Carga el acta de devolución firmada o consigue la autorización de salida sin firma." }, { status: 409 });
    const exitAssessment = await env.DB.prepare("SELECT status FROM exit_assessments WHERE segment_id = ? AND return_inspection_id = ? ORDER BY submitted_at DESC LIMIT 1").bind(segment.id, (returnInspection as { id: number }).id).first<{ status: string }>();
    if (!exitAssessment || !["SIN_OBSERVACIONES", "APROBADA"].includes(exitAssessment.status)) return Response.json({ error: "La revisión comparativa de salida debe estar conforme o aprobada antes de cerrar la estadía." }, { status: 409 });
    const existingTurnover = await env.DB.prepare("SELECT id FROM room_turnovers WHERE room_id = ? AND status != 'COMPLETADO' LIMIT 1").bind(roomId).first();
    if (existingTurnover) return Response.json({ error: "Esta habitación ya tiene un cierre operativo pendiente." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE stays SET status = 'FINALIZADA', check_out = ? WHERE id = ?").bind(now, stay.id),
      env.DB.prepare("UPDATE stay_guests SET left_at = COALESCE(left_at, ?), removed_by = COALESCE(removed_by, ?), removal_reason = COALESCE(removal_reason, 'Salida de la estadía') WHERE stay_id = ? AND left_at IS NULL").bind(now, user?.name || "Recepción", stay.id),
      env.DB.prepare("UPDATE stay_room_segments SET ended_at = ?, end_reason = 'SALIDA', ended_by = ? WHERE id = ?").bind(now, user?.name || "Recepción", segment.id),
      env.DB.prepare("UPDATE contracts SET status = 'FINALIZADO', ended_by = ?, ended_at = ?, end_reason = 'Finalización de la estadía' WHERE stay_id = ? AND status IN ('VIGENTE', 'PENDIENTE_DOCUMENTO')").bind(user?.name || "Recepción", now, stay.id),
      env.DB.prepare("UPDATE rooms SET status = 'LIMPIEZA' WHERE id = ?").bind(roomId),
      env.DB.prepare("INSERT INTO room_turnovers (stay_id, room_id, segment_id, status, created_at) VALUES (?, ?, ?, 'PENDIENTE', ?)").bind(stay.id, roomId, segment.id, now),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', 'Salida registrada', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, exceptionalExit ? "Salida sin firma autorizada · Habitación pendiente de limpieza" : body.detail || "Habitación pendiente de limpieza", user?.name || "Usuario", now),
    ]);
    await logAudit(request, user, { action: exceptionalExit ? "SALIDA_REGISTRADA_SIN_FIRMA" : "SALIDA_REGISTRADA", entityType: "STAY", entityId: stay.id, roomId, newValue: { status: "FINALIZADA", exceptional: Boolean(exceptionalExit) }, reason: exceptionalExit ? "Salida sin firma previamente autorizada" : "Salida normal" }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "stay_reopen") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede reabrir una estadía." }, { status: 403 });
    const reason = String(body.reason || "").trim();
    if (!roomId || !reason) return Response.json({ error: "Indica el motivo de la reapertura." }, { status: 400 });
    const room = await env.DB.prepare("SELECT status, active FROM rooms WHERE id = ?").bind(roomId).first<{ status: string; active: number }>();
    if (!room?.active || room.status !== "LIMPIEZA") return Response.json({ error: "Solo puede reabrirse antes de iniciar la limpieza y si la habitación sigue sin reasignar." }, { status: 409 });
    const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA' LIMIT 1").bind(roomId).first();
    if (activeStay) return Response.json({ error: "La habitación ya fue asignada nuevamente." }, { status: 409 });
    const turnover = await env.DB.prepare("SELECT id, stay_id FROM room_turnovers WHERE room_id = ? AND status = 'PENDIENTE' ORDER BY created_at DESC LIMIT 1").bind(roomId).first<{ id: number; stay_id: number }>();
    if (!turnover) return Response.json({ error: "La limpieza ya comenzó o el cierre operativo no permite reapertura." }, { status: 409 });
    const stay = await env.DB.prepare("SELECT id, status FROM stays WHERE id = ? AND room_id = ?").bind(turnover.stay_id, roomId).first<{ id: number; status: string }>();
    if (!stay || stay.status !== "FINALIZADA") return Response.json({ error: "La estadía ya no está disponible para reapertura." }, { status: 409 });
    const sequence = await env.DB.prepare("SELECT COALESCE(MAX(sequence), 0) AS value FROM stay_room_segments WHERE stay_id = ?").bind(stay.id).first<{ value: number }>();
    await env.DB.batch([
      env.DB.prepare("UPDATE stays SET status = 'ACTIVA', check_out = NULL WHERE id = ? AND status = 'FINALIZADA'").bind(stay.id),
      env.DB.prepare("UPDATE stay_guests SET left_at = NULL, removed_by = NULL, removal_reason = NULL WHERE stay_id = ? AND removal_reason = 'Salida de la estadía'").bind(stay.id),
      env.DB.prepare("UPDATE contracts SET status = CASE WHEN EXISTS (SELECT 1 FROM documents d WHERE d.contract_id = contracts.id AND d.category = 'CONTRATO') THEN 'VIGENTE' ELSE 'PENDIENTE_DOCUMENTO' END, ended_by = NULL, ended_at = NULL, end_reason = NULL WHERE stay_id = ? AND status = 'FINALIZADO' AND end_reason = 'Finalización de la estadía'").bind(stay.id),
      env.DB.prepare("UPDATE room_turnovers SET status = 'COMPLETADO', approved_at = ?, approved_by = ? WHERE id = ? AND status = 'PENDIENTE'").bind(now, `Reapertura: ${user?.name || "Administración"}`, turnover.id),
      env.DB.prepare("INSERT INTO stay_room_segments (stay_id, room_id, sequence, started_at, start_reason, created_by) VALUES (?, ?, ?, ?, ?, ?)").bind(stay.id, roomId, Number(sequence?.value || 0) + 1, now, `REAPERTURA: ${reason}`, user?.name || "Administración"),
      env.DB.prepare("UPDATE rooms SET status = 'OCUPADA' WHERE id = ?").bind(roomId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INGRESO', 'Estadía reabierta', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, reason, user?.name || "Administración", now),
    ]);
    await logAudit(request, user, { action: "ESTADIA_REABIERTA", entityType: "STAY", entityId: stay.id, roomId, oldValue: { status: "FINALIZADA" }, newValue: { status: "ACTIVA", newSegment: Number(sequence?.value || 0) + 1 }, reason }, now);
    return Response.json({ ok: true, stayId: stay.id });
  }

  if (body.action === "transfer") {
    const destinationId = Number(body.destinationRoomId);
    const reason = String(body.reason || "").trim();
    if (!reason) return Response.json({ error: "Indica el motivo del traslado." }, { status: 400 });
    if (destinationId === roomId) return Response.json({ error: "Selecciona una habitación diferente." }, { status: 400 });
    const stay = await env.DB.prepare("SELECT id, (SELECT COUNT(*) FROM stay_guests sg WHERE sg.stay_id = stays.id AND sg.left_at IS NULL) AS guest_count FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number; guest_count: number }>();
    const destination = await env.DB.prepare("SELECT number, status, active, capacity FROM rooms WHERE id = ?").bind(destinationId).first<{ number: string; status: string; active: number; capacity: number }>();
    if (!stay || destination?.status !== "DISPONIBLE" || !destination.active) return Response.json({ error: "La habitación de destino no está disponible." }, { status: 409 });
    const overCapacity = Number(stay.guest_count || 1) > destination.capacity;
    if (overCapacity && body.capacityOverride !== true) return Response.json({ error: `La habitación de destino admite ${destination.capacity} personas. Se requiere autorización administrativa.`, requiresCapacityApproval: true }, { status: 409 });
    if (overCapacity && !canConfigure) return Response.json({ error: "Solo el propietario o administrador puede autorizar este traslado por sobrecapacidad." }, { status: 403 });
    const segment = await env.DB.prepare("SELECT id, sequence FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stay.id, roomId).first<{ id: number; sequence: number }>();
    if (!segment) return Response.json({ error: "No existe un segmento activo para trasladar." }, { status: 409 });
    const [returnInspection, returnSigned] = await Promise.all([
      env.DB.prepare("SELECT id FROM inspections WHERE segment_id = ? AND kind = 'DEVOLUCION' ORDER BY created_at DESC LIMIT 1").bind(segment.id).first<{ id: number }>(),
      env.DB.prepare("SELECT id FROM documents WHERE segment_id = ? AND category = 'ACTA_DEVOLUCION_FIRMADA' LIMIT 1").bind(segment.id).first(),
    ]);
    if (!returnInspection || !returnSigned) return Response.json({ error: "Antes del traslado completa la devolución y carga el acta firmada de la habitación actual." }, { status: 409 });
    const exitAssessment = await env.DB.prepare("SELECT status FROM exit_assessments WHERE segment_id = ? AND return_inspection_id = ? ORDER BY submitted_at DESC LIMIT 1").bind(segment.id, returnInspection.id).first<{ status: string }>();
    if (!exitAssessment || !["SIN_OBSERVACIONES", "APROBADA"].includes(exitAssessment.status)) return Response.json({ error: "Antes del traslado, la revisión comparativa de devolución debe estar conforme o aprobada." }, { status: 409 });
    const segmentReason = `TRASLADO: ${reason}${overCapacity ? " · Sobrecapacidad autorizada" : ""}`;
    await env.DB.batch([
      env.DB.prepare("UPDATE stay_room_segments SET ended_at = ?, end_reason = ?, ended_by = ? WHERE id = ?").bind(now, segmentReason, user?.name || "Recepción", segment.id),
      env.DB.prepare("INSERT INTO stay_room_segments (stay_id, room_id, sequence, started_at, start_reason, created_by) VALUES (?, ?, ?, ?, ?, ?)").bind(stay.id, destinationId, segment.sequence + 1, now, segmentReason, user?.name || "Recepción"),
      env.DB.prepare("UPDATE stays SET room_id = ? WHERE id = ?").bind(destinationId, stay.id),
      env.DB.prepare("UPDATE rooms SET status = 'LIMPIEZA' WHERE id = ?").bind(roomId),
      env.DB.prepare("UPDATE rooms SET status = 'OCUPADA' WHERE id = ?").bind(destinationId),
      env.DB.prepare("INSERT INTO room_turnovers (stay_id, room_id, segment_id, status, created_at) VALUES (?, ?, ?, 'PENDIENTE', ?)").bind(stay.id, roomId, segment.id, now),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CAMBIO', 'Entrega por cambio de habitación', ?, 'COMPLETADO', ?, ?)").bind(destinationId, stay.id, `Nueva habitación ${destination.number} · ${reason}`, user?.name || "Usuario", now),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CAMBIO', 'Devolución por cambio de habitación', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, `Traslado a habitación ${destination.number} · ${reason}`, user?.name || "Usuario", now),
    ]);
    return Response.json({ ok: true });
  }

  if (body.action === "room") {
    if (user?.role === "RECEPCION") return Response.json({ error: "Solo administración puede editar habitaciones." }, { status: 403 });
    if (!roomId) return Response.json({ error: "Habitación inválida." }, { status: 400 });
    const floorId = Number(body.floorId);
    const number = String(body.number || "").trim();
    const current = await env.DB.prepare("SELECT floor_id, status FROM rooms WHERE id = ?").bind(roomId).first<{ floor_id: number; status: string }>();
    if (!current) return Response.json({ error: "Habitación inexistente." }, { status: 404 });
    if (!number) return Response.json({ error: "Indica el número o nombre de la habitación." }, { status: 400 });
    if (floorId && floorId !== current.floor_id && current.status === "OCUPADA") return Response.json({ error: "No se puede mover una habitación ocupada." }, { status: 409 });
    const duplicate = await env.DB.prepare("SELECT id FROM rooms WHERE lower(number) = lower(?) AND id != ?").bind(number, roomId).first();
    if (duplicate) return Response.json({ error: "Ese número o nombre de habitación ya existe." }, { status: 409 });
    if (floorId) {
      const floor = await env.DB.prepare("SELECT active FROM floors WHERE id = ?").bind(floorId).first<{ active: number }>();
      if (!floor?.active) return Response.json({ error: "Selecciona un piso activo." }, { status: 409 });
    }
    await env.DB.prepare("UPDATE rooms SET floor_id = ?, number = ?, type = ?, capacity = ?, notes = ? WHERE id = ?").bind(floorId || current.floor_id, number, body.type || "Estándar", Number(body.capacity) || 1, body.notes || "", roomId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "inventory") {
    if (user?.role === "RECEPCION") return Response.json({ error: "Solo administración puede cambiar el inventario." }, { status: 403 });
    if (!roomId || !String(body.name || "").trim()) return Response.json({ error: "Indica el elemento." }, { status: 400 });
    const itemType = body.itemType === "REUTILIZABLE" ? "REUTILIZABLE" : "PERMANENTE";
    if (body.itemId) {
      await env.DB.prepare("UPDATE inventory_items SET name = ?, quantity = ?, item_type = ?, notes = ? WHERE id = ? AND room_id = ?").bind(String(body.name).trim(), Number(body.quantity) || 1, itemType, body.notes || "", Number(body.itemId), roomId).run();
    } else {
      await env.DB.prepare("INSERT INTO inventory_items (room_id, name, quantity, item_type, notes) VALUES (?, ?, ?, ?, ?)").bind(roomId, String(body.name).trim(), Number(body.quantity) || 1, itemType, body.notes || "").run();
    }
    return Response.json({ ok: true });
  }

  if (body.action === "inventory_delete") {
    if (user?.role === "RECEPCION") return Response.json({ error: "Solo administración puede cambiar el inventario." }, { status: 403 });
    await env.DB.prepare("DELETE FROM inventory_items WHERE id = ? AND room_id = ?").bind(Number(body.itemId), roomId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "infrastructure_save") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede configurar la infraestructura." }, { status: 403 });
    const itemId = Number(body.itemId);
    const area = String(body.area || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    const evidenceCategory = String(body.evidenceCategory || "").trim();
    const allowedInfrastructureCategories = ["BANO", "PAREDES_PISO_TECHO", "PUERTAS_VENTANAS", "ILUMINACION_ENCHUFES", "OTRA_EVIDENCIA"];
    if (!roomId || !area || !name || !allowedInfrastructureCategories.includes(evidenceCategory)) return Response.json({ error: "Completa el área, elemento y categoría de evidencia." }, { status: 400 });
    if (itemId) await env.DB.prepare("UPDATE room_infrastructure_items SET area = ?, name = ?, evidence_category = ?, required_evidence = ?, notes = ? WHERE id = ? AND room_id = ?").bind(area, name, evidenceCategory, body.requiredEvidence === false ? 0 : 1, String(body.notes || ""), itemId, roomId).run();
    else await env.DB.prepare("INSERT INTO room_infrastructure_items (room_id, area, name, evidence_category, required_evidence, active, notes) VALUES (?, ?, ?, ?, ?, 1, ?)").bind(roomId, area, name, evidenceCategory, body.requiredEvidence === false ? 0 : 1, String(body.notes || "")).run();
    return Response.json({ ok: true });
  }

  if (body.action === "infrastructure_toggle") {
    if (!canConfigure) return Response.json({ error: "Solo administración puede configurar la infraestructura." }, { status: 403 });
    const itemId = Number(body.itemId);
    const reason = String(body.reason || "").trim();
    if (!itemId || !reason) return Response.json({ error: "Indica el motivo del cambio." }, { status: 400 });
    await env.DB.prepare("UPDATE room_infrastructure_items SET active = ? WHERE id = ? AND room_id = ?").bind(body.active === false ? 0 : 1, itemId, roomId).run();
    await logAudit(request, user, { action: body.active === false ? "INFRAESTRUCTURA_DESACTIVADA" : "INFRAESTRUCTURA_REACTIVADA", entityType: "ROOM_INFRASTRUCTURE", entityId: itemId, roomId, newValue: { active: body.active !== false }, reason }, now);
    return Response.json({ ok: true });
  }

  if (body.action === "inventory_movement") {
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number }>();
    if (!stay) return Response.json({ error: "La habitación no tiene una estadía activa." }, { status: 409 });
    const segment = await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stay.id, roomId).first<{ id: number }>();
    if (!segment) return Response.json({ error: "No existe un segmento activo." }, { status: 409 });
    const inventoryItemId = Number(body.inventoryItemId) || null;
    const inventoryItem = inventoryItemId ? await env.DB.prepare("SELECT name FROM inventory_items WHERE id = ? AND room_id = ?").bind(inventoryItemId, roomId).first<{ name: string }>() : null;
    const itemName = String(inventoryItem?.name || body.itemName || "").trim();
    const quantity = Math.max(1, Number(body.quantity) || 1);
    const movementType = ["ENTREGA", "RETIRO", "REEMPLAZO"].includes(String(body.movementType)) ? String(body.movementType) : "ENTREGA";
    const reason = String(body.reason || "").trim();
    const responsible = String(body.responsible || "").trim();
    if (!itemName || !reason || !responsible) return Response.json({ error: "Completa el elemento, motivo y responsable físico." }, { status: 400 });
    const result = await env.DB.prepare("INSERT INTO inventory_movements (stay_id, room_id, segment_id, inventory_item_id, item_name, quantity, movement_type, reason, responsible, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(stay.id, roomId, segment.id, inventoryItemId, itemName, quantity, movementType, reason, responsible, user?.name || "Recepción", now).run();
    const movementId = Number(result.meta.last_row_id);
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'MUEBLES', 'Movimiento de inventario', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, `${movementType}: ${quantity} × ${itemName} · ${reason} · Responsable: ${responsible}`, user?.name || "Recepción", now).run();
    await logAudit(request, user, { action: "MOVIMIENTO_INVENTARIO", entityType: "INVENTORY_MOVEMENT", entityId: movementId, roomId, newValue: { itemName, quantity, movementType, responsible }, reason }, now);
    return Response.json({ ok: true, movementId });
  }

  if (body.action === "cleaning_start" || body.action === "cleaning_complete" || body.action === "cleaning_reopen") {
    const turnoverId = Number(body.turnoverId);
    const turnover = await env.DB.prepare("SELECT id, stay_id, status FROM room_turnovers WHERE id = ? AND room_id = ?").bind(turnoverId, roomId).first<{ id: number; stay_id: number; status: string }>();
    if (!turnover) return Response.json({ error: "No existe un cierre operativo para esta habitación." }, { status: 404 });
    if (body.action === "cleaning_start") {
      if (turnover.status !== "PENDIENTE") return Response.json({ error: "La limpieza no está pendiente de inicio." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE room_turnovers SET status = 'EN_LIMPIEZA', cleaning_started_at = ?, cleaning_started_by = ? WHERE id = ?").bind(now, user?.name || "Recepción", turnoverId),
        env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'LIMPIEZA', 'Limpieza iniciada', 'Habitación en proceso de limpieza', 'EN_PROCESO', ?, ?)").bind(roomId, turnover.stay_id, user?.name || "Recepción", now),
      ]);
    } else if (body.action === "cleaning_complete") {
      if (turnover.status !== "EN_LIMPIEZA") return Response.json({ error: "Primero inicia la limpieza." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE room_turnovers SET status = 'PENDIENTE_INSPECCION', cleaning_completed_at = ?, cleaning_completed_by = ? WHERE id = ?").bind(now, user?.name || "Recepción", turnoverId),
        env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'LIMPIEZA', 'Limpieza finalizada', 'Pendiente de inspección final', 'COMPLETADO', ?, ?)").bind(roomId, turnover.stay_id, user?.name || "Recepción", now),
      ]);
    } else {
      if (turnover.status !== "OBSERVADO") return Response.json({ error: "La habitación no tiene una inspección observada." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE room_turnovers SET status = 'PENDIENTE', cleaning_started_at = NULL, cleaning_started_by = NULL, cleaning_completed_at = NULL, cleaning_completed_by = NULL WHERE id = ?").bind(turnoverId),
        env.DB.prepare("UPDATE rooms SET status = 'LIMPIEZA' WHERE id = ?").bind(roomId),
        env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'LIMPIEZA', 'Nueva limpieza solicitada', 'Se corregirán las observaciones de la inspección final', 'PENDIENTE', ?, ?)").bind(roomId, turnover.stay_id, user?.name || "Recepción", now),
      ]);
    }
    return Response.json({ ok: true });
  }

  if (body.action === "inspection") {
    const stayId = Number(body.stayId);
    const kind = body.kind === "LIMPIEZA_FINAL" ? "LIMPIEZA_FINAL" : body.kind === "DEVOLUCION" ? "DEVOLUCION" : "ENTREGA";
    if (!roomId || !stayId) return Response.json({ error: "No hay una estadía asociada." }, { status: 400 });
    const items = ((body.items || []) as Array<{ id?: number; name?: string; quantity?: number; condition?: string; notes?: string }>).filter((item) => item.name);
    if (!items.length) return Response.json({ error: "La inspección debe contener al menos un elemento." }, { status: 400 });
    let turnover: { id: number; status: string; segment_id: number | null } | null = null;
    let segmentId: number | null = null;
    if (kind === "LIMPIEZA_FINAL") {
      turnover = await env.DB.prepare("SELECT id, status, segment_id FROM room_turnovers WHERE stay_id = ? AND room_id = ? AND status != 'COMPLETADO' ORDER BY created_at DESC LIMIT 1").bind(stayId, roomId).first<{ id: number; status: string; segment_id: number | null }>() || null;
      if (!turnover || turnover.status !== "PENDIENTE_INSPECCION") return Response.json({ error: "La limpieza debe estar finalizada antes de inspeccionar." }, { status: 409 });
      segmentId = turnover.segment_id;
    } else {
      const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE id = ? AND room_id = ? AND status = 'ACTIVA'").bind(stayId, roomId).first();
      if (!activeStay) return Response.json({ error: "La estadía ya no está activa en esta habitación." }, { status: 409 });
      const segment = await env.DB.prepare("SELECT id FROM stay_room_segments WHERE stay_id = ? AND room_id = ? AND ended_at IS NULL ORDER BY sequence DESC LIMIT 1").bind(stayId, roomId).first<{ id: number }>();
      if (!segment) return Response.json({ error: "No existe un segmento activo para esta inspección." }, { status: 409 });
      segmentId = segment.id;
    }
    const inspectionResult = await env.DB.prepare("INSERT INTO inspections (stay_id, room_id, segment_id, kind, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(stayId, roomId, segmentId, kind, body.notes || "", user?.name || "Usuario", now).run();
    const inspectionId = Number(inspectionResult.meta.last_row_id);
    const itemStatements = items.map((item) => env.DB.prepare("INSERT INTO inspection_items (inspection_id, inventory_item_id, name, quantity, condition, notes) VALUES (?, ?, ?, ?, ?, ?)").bind(inspectionId, item.id || null, item.name, item.quantity || 1, item.condition || "BUENO", item.notes || ""));
    if (itemStatements.length) await env.DB.batch(itemStatements);
    if (kind === "LIMPIEZA_FINAL" && turnover) {
      const hasIssues = items.some((item) => item.condition !== "BUENO");
      const blockingTask = await env.DB.prepare("SELECT id, title FROM work_orders WHERE room_id = ? AND blocks_room = 1 AND status IN ('PENDIENTE', 'EN_PROCESO') ORDER BY created_at LIMIT 1").bind(roomId).first<{ id: number; title: string }>();
      const blocked = hasIssues || Boolean(blockingTask);
      const closingDetail = blockingTask ? "Trabajo pendiente: " + blockingTask.title : body.notes || (hasIssues ? "Requiere correcciones" : "Limpieza aprobada");
      await env.DB.batch([
        env.DB.prepare("UPDATE room_turnovers SET status = ?, final_inspection_id = ?, approved_at = ?, approved_by = ? WHERE id = ?").bind(blocked ? "OBSERVADO" : "COMPLETADO", inspectionId, blocked ? null : now, blocked ? null : user?.name || "Recepción", turnover.id),
        env.DB.prepare("UPDATE rooms SET status = ? WHERE id = ?").bind(blocked ? "MANTENIMIENTO" : "DISPONIBLE", roomId),
        env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INSPECCION', ?, ?, ?, ?, ?)").bind(roomId, stayId, blocked ? "Inspección final observada" : "Habitación habilitada", closingDetail, blocked ? "PENDIENTE" : "COMPLETADO", user?.name || "Recepción", now),
      ]);
      return Response.json({ ok: true, inspectionId, roomStatus: blocked ? "MANTENIMIENTO" : "DISPONIBLE" });
    }
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INSPECCION', ?, ?, 'COMPLETADO', ?, ?)").bind(roomId, stayId, kind === "ENTREGA" ? "Acta de entrega completada" : "Acta de devolución completada", body.notes || "Sin observaciones generales", user?.name || "Usuario", now).run();
    return Response.json({ ok: true, inspectionId });
  }

  if (body.action === "user_invite") {
    if (user?.role !== "PROPIETARIO" && user?.role !== "ADMINISTRADOR") return Response.json({ error: "No tienes permiso para dar acceso al personal." }, { status: 403 });
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = ["PROPIETARIO", "ADMINISTRADOR", "RECEPCION"].includes(String(body.role)) ? String(body.role) : "RECEPCION";
    const reason = String(body.reason || "").trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !reason) return Response.json({ error: "Indica nombre, correo y motivo válidos." }, { status: 400 });
    if (role === "PROPIETARIO" && user?.role !== "PROPIETARIO") return Response.json({ error: "Solo un propietario puede autorizar a otro propietario." }, { status: 403 });
    const duplicate = await env.DB.prepare("SELECT id, active FROM users WHERE lower(email) = lower(?)").bind(email).first<{ id: number; active: number }>();
    if (duplicate) return Response.json({ error: duplicate.active ? "Ese correo ya está registrado." : "Ese correo pertenece a un trabajador desactivado. Reactívalo desde la lista." }, { status: 409 });
    const result = await env.DB.prepare("INSERT INTO users (external_id, email, name, role, active, invited_by, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)").bind(`pending:${email}`, email, name, role, user?.name || "Administración", now).run();
    const targetId = Number(result.meta.last_row_id);
    await env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'INVITACION_CREADA', ?, ?, ?)").bind(targetId, reason, user?.name || "Administración", now).run();
    await logAudit(request, user, { action: "TRABAJADOR_INVITADO", entityType: "USER", entityId: targetId, newValue: { email, role, status: "PENDIENTE" }, reason }, now);
    return Response.json({ ok: true, userId: targetId });
  }

  if (body.action === "user") {
    if (user?.role !== "PROPIETARIO" && user?.role !== "ADMINISTRADOR") return Response.json({ error: "No tienes permiso para administrar personal." }, { status: 403 });
    const targetId = Number(body.userId);
    if (!targetId) return Response.json({ error: "Trabajador inválido." }, { status: 400 });
    if (targetId === user?.id) return Response.json({ error: "Tu propio rol y acceso deben ser administrados por otro propietario." }, { status: 400 });
    const role = ["PROPIETARIO", "ADMINISTRADOR", "RECEPCION"].includes(String(body.role)) ? body.role : "RECEPCION";
    const current = await env.DB.prepare("SELECT name, email, role, active FROM users WHERE id = ?").bind(targetId).first<{ name: string; email: string; role: string; active: number }>();
    if (!current) return Response.json({ error: "Trabajador inexistente." }, { status: 404 });
    if ((current.role === "PROPIETARIO" || role === "PROPIETARIO") && user?.role !== "PROPIETARIO") return Response.json({ error: "Solo un propietario puede modificar cuentas de propietario." }, { status: 403 });
    const active = body.active === false ? 0 : 1;
    const changedRole = current.role !== role;
    const changedAccess = current.active !== active;
    const reason = String(body.reason || "").trim();
    if (!changedRole && !changedAccess) return Response.json({ error: "No hay cambios para guardar." }, { status: 400 });
    if (!reason) return Response.json({ error: "Indica el motivo del cambio." }, { status: 400 });
    if (current.role === "PROPIETARIO" && (!active || role !== "PROPIETARIO")) {
      const owners = await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'PROPIETARIO' AND active = 1").first<{ total: number }>();
      if ((owners?.total || 0) <= 1) return Response.json({ error: "Debe permanecer al menos un propietario activo." }, { status: 409 });
    }
    const openAssignments = !active ? await env.DB.prepare("SELECT id, status FROM work_orders WHERE assigned_user_id = ? AND status IN ('PENDIENTE', 'EN_PROCESO')").bind(targetId).all<{ id: number; status: string }>() : { results: [] };
    const statements = [
      env.DB.prepare("UPDATE users SET role = ?, active = ?, deactivated_at = ?, deactivated_by = ?, deactivation_reason = ? WHERE id = ?").bind(role, active, active ? null : now, active ? null : user?.name || "Administración", active ? null : reason, targetId),
    ];
    if (changedRole) statements.push(env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'ROL_MODIFICADO', ?, ?, ?)").bind(targetId, reason, user?.name || "Administración", now));
    if (changedAccess) statements.push(env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, ?, ?, ?, ?)").bind(targetId, active ? "ACCESO_REACTIVADO" : "ACCESO_DESACTIVADO", reason, user?.name || "Administración", now));
    if (!active && openAssignments.results.length) {
      statements.push(env.DB.prepare("UPDATE work_orders SET assigned_user_id = NULL WHERE assigned_user_id = ? AND status IN ('PENDIENTE', 'EN_PROCESO')").bind(targetId));
      for (const order of openAssignments.results) statements.push(env.DB.prepare("INSERT INTO work_order_history (work_order_id, action, from_status, to_status, detail, performed_by, created_at) VALUES (?, 'RESPONSABLE_LIBERADO', ?, ?, ?, ?, ?)").bind(order.id, order.status, order.status, `Baja de ${current.name}: ${reason}`, user?.name || "Administración", now));
    }
    await env.DB.batch(statements);
    await logAudit(request, user, { action: changedAccess ? (active ? "TRABAJADOR_REACTIVADO" : "TRABAJADOR_DESACTIVADO") : "ROL_TRABAJADOR_MODIFICADO", entityType: "USER", entityId: targetId, oldValue: { role: current.role, active: Boolean(current.active) }, newValue: { role, active: Boolean(active), releasedTasks: openAssignments.results.length }, reason }, now);
    return Response.json({ ok: true, releasedTasks: openAssignments.results.length });
  }

  return Response.json({ error: "Acción desconocida." }, { status: 400 });
}
