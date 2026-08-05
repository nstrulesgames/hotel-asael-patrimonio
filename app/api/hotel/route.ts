import { env } from "cloudflare:workers";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, external_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS floors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, position INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, floor_id INTEGER NOT NULL, number TEXT NOT NULL UNIQUE, type TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS guests (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, ci TEXT, phone TEXT, is_minor INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS stays (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, primary_guest_id INTEGER NOT NULL, stay_type TEXT NOT NULL, check_in TEXT NOT NULL, expected_check_out TEXT, check_out TEXT, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS stay_guests (id INTEGER PRIMARY KEY AUTOINCREMENT, stay_id INTEGER NOT NULL, guest_id INTEGER NOT NULL, is_primary INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS room_events (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, stay_id INTEGER, category TEXT NOT NULL, filename TEXT NOT NULL, object_key TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stays_room_status ON stays(room_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_events_room_created ON room_events(room_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_stay_id ON documents(stay_id)`,
];

type DbResult<T> = { results: T[] };

async function ensureDatabase() {
  const db = env.DB;
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
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
  const existing = await env.DB.prepare("SELECT id, name, email, role FROM users WHERE external_id = ?").bind(user.externalId).first();
  if (existing) return existing;
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  const role = count?.total ? "RECEPCION" : "PROPIETARIO";
  await env.DB.prepare("INSERT INTO users (external_id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)").bind(user.externalId, user.email, user.name, role, new Date().toISOString()).run();
  return env.DB.prepare("SELECT id, name, email, role FROM users WHERE external_id = ?").bind(user.externalId).first();
}

export async function GET(request: Request) {
  await ensureDatabase();
  let user;
  try { user = await ensureUser(request); } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Debes iniciar sesión." }, { status: 401 }); throw error; }
  const [floors, rooms, events] = await Promise.all([
    env.DB.prepare("SELECT id, name, position FROM floors ORDER BY position").all(),
    env.DB.prepare(`SELECT r.*, s.id AS stay_id, s.stay_type, s.check_in, s.expected_check_out, g.full_name AS guest_name, g.ci AS guest_ci,
      (SELECT COUNT(*) FROM stay_guests sg WHERE sg.stay_id = s.id) AS guest_count
      FROM rooms r LEFT JOIN stays s ON s.room_id = r.id AND s.status = 'ACTIVA'
      LEFT JOIN guests g ON g.id = s.primary_guest_id ORDER BY CAST(r.number AS INTEGER), r.number`).all(),
    env.DB.prepare("SELECT e.*, r.number AS room_number FROM room_events e JOIN rooms r ON r.id = e.room_id ORDER BY e.created_at DESC LIMIT 12").all(),
  ]);
  return Response.json({ user, floors: floors.results, rooms: rooms.results, events: events.results });
}

type ActionPayload = Record<string, unknown> & { action?: string };

export async function POST(request: Request) {
  await ensureDatabase();
  let user;
  try { user = await ensureUser(request) as { name?: string; role?: string } | null; } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "Debes iniciar sesión." }, { status: 401 }); throw error; }
  const body = await request.json() as ActionPayload;
  const now = new Date().toISOString();
  const roomId = Number(body.roomId);

  if (body.action === "checkin") {
    const primary = body.primary as { fullName?: string; ci?: string; phone?: string };
    if (!roomId || !primary?.fullName?.trim()) return Response.json({ error: "Falta el huésped titular." }, { status: 400 });
    const room = await env.DB.prepare("SELECT status FROM rooms WHERE id = ?").bind(roomId).first<{ status: string }>();
    if (room?.status !== "DISPONIBLE") return Response.json({ error: "La habitación ya no está disponible." }, { status: 409 });
    const guestResult = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, created_at) VALUES (?, ?, ?, 0, ?)").bind(primary.fullName.trim(), primary.ci || null, primary.phone || null, now).run();
    const primaryId = Number(guestResult.meta.last_row_id);
    const stayResult = await env.DB.prepare("INSERT INTO stays (room_id, primary_guest_id, stay_type, check_in, expected_check_out, status, notes) VALUES (?, ?, ?, ?, ?, 'ACTIVA', ?)").bind(roomId, primaryId, body.stayType || "DIA", now, body.expectedCheckOut || null, body.notes || "").run();
    const stayId = Number(stayResult.meta.last_row_id);
    const companionStatements = [env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary) VALUES (?, ?, 1)").bind(stayId, primaryId)];
    for (const companion of (body.companions || []) as Array<{ fullName?: string; ci?: string; phone?: string; isMinor?: boolean }>) {
      if (!companion.fullName?.trim()) continue;
      const result = await env.DB.prepare("INSERT INTO guests (full_name, ci, phone, is_minor, created_at) VALUES (?, ?, ?, ?, ?)").bind(companion.fullName.trim(), companion.ci || null, companion.phone || null, companion.isMinor ? 1 : 0, now).run();
      companionStatements.push(env.DB.prepare("INSERT INTO stay_guests (stay_id, guest_id, is_primary) VALUES (?, ?, 0)").bind(stayId, Number(result.meta.last_row_id)));
    }
    await env.DB.batch([
      ...companionStatements,
      env.DB.prepare("UPDATE rooms SET status = 'OCUPADA' WHERE id = ?").bind(roomId),
      env.DB.prepare("INSERT INTO room_events (room_id, stay_id, type, title, detail, status, created_by, created_at) VALUES (?, ?, 'INGRESO', 'Ingreso de huésped', ?, 'COMPLETADO', ?, ?)").bind(roomId, stayId, `Titular: ${primary.fullName}`, user?.name || "Usuario", now),
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
    await env.DB.prepare("UPDATE rooms SET number = ?, type = ?, capacity = ?, notes = ? WHERE id = ?").bind(body.number, body.type || "Estándar", Number(body.capacity) || 1, body.notes || "", roomId).run();
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción desconocida." }, { status: 400 });
}
