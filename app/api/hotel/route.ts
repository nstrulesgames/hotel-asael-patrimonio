import { env } from "cloudflare:workers";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, external_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS user_access_events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL, performed_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS floors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, position INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, floor_id INTEGER NOT NULL, number TEXT NOT NULL UNIQUE, type TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS guests (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, ci TEXT, phone TEXT, is_minor INTEGER NOT NULL DEFAULT 0, identification_pending INTEGER NOT NULL DEFAULT 0, updated_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS stays (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, primary_guest_id INTEGER NOT NULL, stay_type TEXT NOT NULL, check_in TEXT NOT NULL, expected_check_out TEXT, check_out TEXT, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', capacity_override INTEGER NOT NULL DEFAULT 0, capacity_override_reason TEXT, capacity_authorized_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS stay_guests (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, guest_id INTEGER NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS room_events (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, category TEXT NOT NULL, filename TEXT NOT NULL, object_key TEXT NOT NULL, content_type TEXT NOT NULL, uploaded_by TEXT NOT NULL DEFAULT 'Hotel ASAEL', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS inspections (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, room_id INTEGER NOT NULL, kind TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS inspection_items (id INTEGER PRIMARY KEY AUTOINCREMENT, inspection_id INTEGER NOT NULL, inventory_item_id INTEGER, name TEXT NOT NULL, quantity INTEGER NOT NULL, condition TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stays_room_status ON stays(room_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_events_room_created ON room_events(room_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_stay_id ON documents(stay_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_room_id ON inventory_items(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inspections_stay_kind ON inspections(stay_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_access_events_user ON user_access_events(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_guests_ci ON guests(ci)`,
];

type DbResult<T> = { results: T[] };

async function ensureDatabase() {
  const db = env.DB;
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const userColumns = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  if (!userColumns.results.some((column) => column.name === "active")) {
    await db.prepare("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1").run();
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
    const baseItems = [["Cama", 1], ["Almohada", 2], ["Juego de sábanas", 1], ["Cubrecama", 1], ["Mesa", 1], ["Cómoda", 1], ["Silla", 1]] as const;
    const inventoryStatements = roomRows.results.flatMap((room) => baseItems.map(([name, quantity]) => db.prepare("INSERT INTO inventory_items (room_id, name, quantity, notes) VALUES (?, ?, ?, '')").bind(room.id, name, quantity)));
    if (inventoryStatements.length) await db.batch(inventoryStatements);
  }
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
  const existing = await env.DB.prepare("SELECT id, name, email, role, active FROM users WHERE external_id = ?").bind(user.externalId).first<{ id: number; name: string; email: string; role: string; active: number }>();
  if (existing && !existing.active) throw new Error("DEACTIVATED");
  if (existing) return existing;
  const invited = await env.DB.prepare("SELECT id, name, email, role, active, external_id FROM users WHERE lower(email) = lower(?)").bind(user.email.trim()).first<{ id: number; name: string; email: string; role: string; active: number; external_id: string }>();
  if (invited && !invited.active) throw new Error("DEACTIVATED");
  if (invited && invited.external_id.startsWith("pending:")) {
    await env.DB.prepare("UPDATE users SET external_id = ?, name = CASE WHEN name = '' THEN ? ELSE name END WHERE id = ?").bind(user.externalId, user.name, invited.id).run();
    await env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'PRIMER_ACCESO', 'Correo verificado al iniciar sesión', ?, ?)").bind(invited.id, user.name, new Date().toISOString()).run();
    return env.DB.prepare("SELECT id, name, email, role, active FROM users WHERE id = ?").bind(invited.id).first();
  }
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if (count?.total) throw new Error("NOT_AUTHORIZED");
  const role = "PROPIETARIO";
  await env.DB.prepare("INSERT INTO users (external_id, email, name, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)").bind(user.externalId, user.email, user.name, role, new Date().toISOString()).run();
  return env.DB.prepare("SELECT id, name, email, role, active FROM users WHERE external_id = ?").bind(user.externalId).first();
}

function userErrorResponse(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "UNAUTHORIZED") return Response.json({ error: "Debes iniciar sesión con tu correo autorizado." }, { status: 401 });
  if (error.message === "DEACTIVATED") return Response.json({ error: "Tu acceso fue desactivado. Contacta a administración." }, { status: 403 });
  if (error.message === "NOT_AUTHORIZED") return Response.json({ error: "Este correo no está autorizado para ingresar al Hotel ASAEL." }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  await ensureDatabase();
  let user;
  try { user = await ensureUser(request); } catch (error) { const response = userErrorResponse(error); if (response) return response; throw error; }
  const [floors, rooms, events, inventory, inspections, inspectionItems, users, documents] = await Promise.all([
    env.DB.prepare("SELECT id, name, position, active FROM floors ORDER BY position, name").all(),
    env.DB.prepare(`SELECT r.*, s.id AS stay_id, s.stay_type, s.check_in, s.expected_check_out, g.full_name AS guest_name, g.ci AS guest_ci,
      (SELECT COUNT(*) FROM stay_guests sg WHERE sg.stay_id = s.id) AS guest_count
      FROM rooms r LEFT JOIN stays s ON s.room_id = r.id AND s.status = 'ACTIVA'
      LEFT JOIN guests g ON g.id = s.primary_guest_id ORDER BY CAST(r.number AS INTEGER), r.number`).all(),
    env.DB.prepare("SELECT e.*, r.number AS room_number FROM room_events e JOIN rooms r ON r.id = e.room_id ORDER BY e.created_at DESC LIMIT 12").all(),
    env.DB.prepare("SELECT id, room_id, name, quantity, notes FROM inventory_items ORDER BY name").all(),
    env.DB.prepare("SELECT * FROM inspections ORDER BY created_at DESC").all(),
    env.DB.prepare("SELECT * FROM inspection_items ORDER BY id").all(),
    env.DB.prepare("SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, name").all(),
    env.DB.prepare("SELECT id, room_id, stay_id, category, filename, content_type, uploaded_by, created_at FROM documents ORDER BY created_at DESC").all(),
  ]);
  return Response.json({ user, floors: floors.results, rooms: rooms.results, events: events.results, inventory: inventory.results, inspections: inspections.results, inspectionItems: inspectionItems.results, users: users.results, documents: documents.results });
}

type ActionPayload = Record<string, unknown> & { action?: string };

function normalizeCi(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function POST(request: Request) {
  await ensureDatabase();
  let user;
  try { user = await ensureUser(request) as { id?: number; name?: string; role?: string } | null; } catch (error) { const response = userErrorResponse(error); if (response) return response; throw error; }
  const body = await request.json() as ActionPayload;
  const now = new Date().toISOString();
  const roomId = Number(body.roomId);
  const canConfigure = user?.role === "PROPIETARIO" || user?.role === "ADMINISTRADOR";

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
      const sourceItems = await env.DB.prepare("SELECT name, quantity, notes FROM inventory_items WHERE room_id = ?").bind(Number(body.sourceRoomId)).all<{ name: string; quantity: number; notes: string }>();
      sourceItems.results.forEach((item) => inventoryStatements.push(env.DB.prepare("INSERT INTO inventory_items (room_id, name, quantity, notes) VALUES (?, ?, ?, ?)").bind(newRoomId, item.name, item.quantity, item.notes)));
    } else if (inventoryMode === "BASE") {
      const baseItems = [["Cama", 1], ["Almohada", 2], ["Juego de sábanas", 1], ["Cubrecama", 1], ["Mesa", 1], ["Cómoda", 1], ["Silla", 1]] as const;
      baseItems.forEach(([name, quantity]) => inventoryStatements.push(env.DB.prepare("INSERT INTO inventory_items (room_id, name, quantity, notes) VALUES (?, ?, ?, '')").bind(newRoomId, name, quantity)));
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
      const activeStay = await env.DB.prepare("SELECT id FROM stays WHERE primary_guest_id = ? AND status = 'ACTIVA' LIMIT 1").bind(existingPrimary.id).first();
      if (activeStay) return Response.json({ error: "Este huésped ya figura como titular de una estadía activa." }, { status: 409 });
      primaryId = existingPrimary.id;
      await env.DB.prepare("UPDATE guests SET full_name = ?, phone = COALESCE(NULLIF(?, ''), phone), ci = ?, identification_pending = 0, updated_at = ? WHERE id = ?").bind(primary.fullName.trim(), primary.phone || "", primaryCi, now, primaryId).run();
    } else {
      const guestResult = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, identification_pending, updated_at, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)").bind(primary.fullName.trim(), primaryCi || null, primary.phone || null, identificationPending ? 1 : 0, now, now).run();
      primaryId = Number(guestResult.meta.last_row_id);
    }

    const stayResult = await env.DB.prepare("INSERT INTO stays (room_id, primary_guest_id, stay_type, check_in, expected_check_out, status, notes, capacity_override, capacity_override_reason, capacity_authorized_by) VALUES (?, ?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?)").bind(roomId, primaryId, body.stayType || "DIA", now, body.expectedCheckOut || null, body.notes || "", overCapacity ? 1 : 0, overCapacity ? overrideReason : null, overCapacity ? user?.name || "Administración" : null).run();
    const stayId = Number(stayResult.meta.last_row_id);
    const companionStatements = [env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary) VALUES (?, ?, 1)").bind(stayId, primaryId)];
    for (const companion of companions) {
      const companionCi = normalizeCi(companion.ci);
      const existing = companionCi ? await env.DB.prepare("SELECT id FROM guests WHERE upper(replace(replace(replace(ci, ' ', ''), '-', ''), '.', '')) = ? LIMIT 1").bind(companionCi).first<{ id: number }>() : null;
      let guestId = existing?.id;
      if (guestId) {
        await env.DB.prepare("UPDATE guests SET full_name = ?, phone = COALESCE(NULLIF(?, ''), phone), ci = ?, identification_pending = 0, is_minor = ?, updated_at = ? WHERE id = ?").bind(companion.fullName!.trim(), companion.phone || "", companionCi, companion.isMinor ? 1 : 0, now, guestId).run();
      } else {
        const result = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, identification_pending, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(companion.fullName!.trim(), companionCi || null, companion.phone || null, companion.isMinor ? 1 : 0, companionCi ? 0 : 1, now, now).run();
        guestId = Number(result.meta.last_row_id);
      }
      companionStatements.push(env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary) VALUES (?, ?, 0)").bind(stayId, guestId));
    }
    await env.DB.batch([
      ...companionStatements,
      env.DB.prepare("UPDATE rooms SET status = 'OCUPADA' WHERE id = ?").bind(roomId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INGRESO', 'Ingreso de huésped', ?, 'COMPLETADO', ?, ?)").bind(roomId, stayId, `Titular: ${primary.fullName}${identificationPending ? ' · Identificación pendiente' : ''}${overCapacity ? ' · Sobrecapacidad autorizada' : ''}`, user?.name || "Usuario", now),
    ]);
    return Response.json({ ok: true, stayId });
  }

  if (body.action === "event") {
    if (!roomId || !body.title) return Response.json({ error: "Completa el evento." }, { status: 400 });
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(roomId, body.stayId || null, body.type || "OTRO", body.title, body.detail || "", body.status || "PENDIENTE", user?.name || "Usuario", now).run();
    if (body.roomStatus) await env.DB.prepare("UPDATE rooms SET status = ? WHERE id = ?").bind(body.roomStatus, roomId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "checkout") {
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number }>();
    if (!stay) return Response.json({ error: "No existe una estadía activa." }, { status: 404 });
    const returnInspection = await env.DB.prepare("SELECT id FROM inspections WHERE stay_id = ? AND kind = 'DEVOLUCION' ORDER BY created_at DESC LIMIT 1").bind(stay.id).first();
    if (!returnInspection) return Response.json({ error: "Primero completa el acta de devolución." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE stays SET status = 'FINALIZADA', check_out = ? WHERE id = ?").bind(now, stay.id),
      env.DB.prepare("UPDATE rooms SET status = 'LIMPIEZA' WHERE id = ?").bind(roomId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'SALIDA', 'Salida registrada', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, body.detail || "Habitación pendiente de limpieza", user?.name || "Usuario", now),
    ]);
    return Response.json({ ok: true });
  }

  if (body.action === "transfer") {
    const destinationId = Number(body.destinationRoomId);
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE room_id = ? AND status = 'ACTIVA'").bind(roomId).first<{ id: number }>();
    const destination = await env.DB.prepare("SELECT number, status FROM rooms WHERE id = ?").bind(destinationId).first<{ number: string; status: string }>();
    if (!stay || destination?.status !== "DISPONIBLE") return Response.json({ error: "No se puede realizar el cambio." }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE stays SET room_id = ? WHERE id = ?").bind(destinationId, stay.id),
      env.DB.prepare("UPDATE rooms SET status = 'LIMPIEZA' WHERE id = ?").bind(roomId),
      env.DB.prepare("UPDATE rooms SET status = 'OCUPADA' WHERE id = ?").bind(destinationId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CAMBIO', 'Entrega por cambio de habitación', ?, 'COMPLETADO', ?, ?)").bind(destinationId, stay.id, `Nueva habitación ${destination.number}`, user?.name || "Usuario", now),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'CAMBIO', 'Devolución por cambio de habitación', ?, 'COMPLETADO', ?, ?)").bind(roomId, stay.id, `Traslado a habitación ${destination.number}`, user?.name || "Usuario", now),
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
    if (body.itemId) {
      await env.DB.prepare("UPDATE inventory_items SET name = ?, quantity = ?, notes = ? WHERE id = ? AND room_id = ?").bind(String(body.name).trim(), Number(body.quantity) || 1, body.notes || "", Number(body.itemId), roomId).run();
    } else {
      await env.DB.prepare("INSERT INTO inventory_items (room_id, name, quantity, notes) VALUES (?, ?, ?, ?)").bind(roomId, String(body.name).trim(), Number(body.quantity) || 1, body.notes || "").run();
    }
    return Response.json({ ok: true });
  }

  if (body.action === "inventory_delete") {
    if (user?.role === "RECEPCION") return Response.json({ error: "Solo administración puede cambiar el inventario." }, { status: 403 });
    await env.DB.prepare("DELETE FROM inventory_items WHERE id = ? AND room_id = ?").bind(Number(body.itemId), roomId).run();
    return Response.json({ ok: true });
  }

  if (body.action === "inspection") {
    const stayId = Number(body.stayId);
    const kind = body.kind === "DEVOLUCION" ? "DEVOLUCION" : "ENTREGA";
    if (!roomId || !stayId) return Response.json({ error: "No hay una estadía activa." }, { status: 400 });
    const inspectionResult = await env.DB.prepare("INSERT INTO inspections (stay_id, room_id, kind, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(stayId, roomId, kind, body.notes || "", user?.name || "Usuario", now).run();
    const inspectionId = Number(inspectionResult.meta.last_row_id);
    const itemStatements = ((body.items || []) as Array<{ id?: number; name?: string; quantity?: number; condition?: string; notes?: string }>).filter((item) => item.name).map((item) => env.DB.prepare("INSERT INTO inspection_items (inspection_id, inventory_item_id, name, quantity, condition, notes) VALUES (?, ?, ?, ?, ?, ?)").bind(inspectionId, item.id || null, item.name, item.quantity || 1, item.condition || "BUENO", item.notes || ""));
    if (itemStatements.length) await env.DB.batch(itemStatements);
    await env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INSPECCION', ?, ?, 'COMPLETADO', ?, ?)").bind(roomId, stayId, kind === "ENTREGA" ? "Acta de entrega completada" : "Acta de devolución completada", body.notes || "Sin observaciones generales", user?.name || "Usuario", now).run();
    return Response.json({ ok: true, inspectionId });
  }

  if (body.action === "user_invite") {
    if (user?.role !== "PROPIETARIO" && user?.role !== "ADMINISTRADOR") return Response.json({ error: "No tienes permiso para dar acceso al personal." }, { status: 403 });
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const role = ["PROPIETARIO", "ADMINISTRADOR", "RECEPCION"].includes(String(body.role)) ? String(body.role) : "RECEPCION";
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Indica un nombre y correo válidos." }, { status: 400 });
    const duplicate = await env.DB.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").bind(email).first();
    if (duplicate) return Response.json({ error: "Ese correo ya está registrado." }, { status: 409 });
    const result = await env.DB.prepare("INSERT INTO users (external_id, email, name, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)").bind(`pending:${email}`, email, name, role, now).run();
    const targetId = Number(result.meta.last_row_id);
    await env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'ACCESO_CREADO', ?, ?, ?)").bind(targetId, String(body.reason || "Alta de trabajador"), user?.name || "Administración", now).run();
    return Response.json({ ok: true, userId: targetId });
  }

  if (body.action === "user") {
    if (user?.role !== "PROPIETARIO" && user?.role !== "ADMINISTRADOR") return Response.json({ error: "No tienes permiso para administrar personal." }, { status: 403 });
    const targetId = Number(body.userId);
    if (!targetId) return Response.json({ error: "Trabajador inválido." }, { status: 400 });
    if (targetId === user?.id && body.active === false) return Response.json({ error: "No puedes desactivar tu propio acceso." }, { status: 400 });
    const role = ["PROPIETARIO", "ADMINISTRADOR", "RECEPCION"].includes(String(body.role)) ? body.role : "RECEPCION";
    const current = await env.DB.prepare("SELECT role, active FROM users WHERE id = ?").bind(targetId).first<{ role: string; active: number }>();
    if (!current) return Response.json({ error: "Trabajador inexistente." }, { status: 404 });
    const active = body.active === false ? 0 : 1;
    const changedRole = current.role !== role;
    const changedAccess = current.active !== active;
    const reason = String(body.reason || "").trim();
    if ((changedRole || (changedAccess && !active)) && !reason) return Response.json({ error: "Indica el motivo del cambio." }, { status: 400 });
    await env.DB.prepare("UPDATE users SET role = ?, active = ? WHERE id = ?").bind(role, body.active === false ? 0 : 1, targetId).run();
    if (changedRole) await env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, 'ROL_MODIFICADO', ?, ?, ?)").bind(targetId, reason, user?.name || "Administración", now).run();
    if (changedAccess) await env.DB.prepare("INSERT INTO user_access_events (user_id, action, reason, performed_by, created_at) VALUES (?, ?, ?, ?, ?)").bind(targetId, active ? "ACCESO_REACTIVADO" : "ACCESO_DESACTIVADO", reason || "Reactivación administrativa", user?.name || "Administración", now).run();
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción desconocida." }, { status: 400 });
}
