import { env } from "cloudflare:workers";

type ReportRow = Record<string, string | number | null>;

async function authorizedAdministrator(request: Request) {
  const url = new URL(request.url);
  const externalId = request.headers.get("oai-authenticated-user-id") || (url.hostname === "localhost" || url.hostname === "127.0.0.1" ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  if (!externalId) return null;
  return env.DB.prepare("SELECT id, name, role, active FROM users WHERE (external_id = ? OR lower(email) = lower(?)) AND active = 1 AND role IN ('PROPIETARIO', 'ADMINISTRADOR') LIMIT 1").bind(externalId, email).first<{ id: number; name: string; role: string; active: number }>();
}

function safeCsvValue(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""').replaceAll("\r", " ").replaceAll("\n", " ")}"`;
}

function csv(rows: ReportRow[]) {
  if (!rows.length) return "\uFEFFSin registros\r\n";
  const headers = Object.keys(rows[0]);
  return "\uFEFF" + headers.map(safeCsvValue).join(";") + "\r\n" + rows.map((row) => headers.map((header) => safeCsvValue(row[header])).join(";")).join("\r\n");
}

function dateFilter(column: string, from: string, to: string) {
  const clauses: string[] = [];
  const bindings: string[] = [];
  if (from) { clauses.push(`date(${column}) >= date(?)`); bindings.push(from); }
  if (to) { clauses.push(`date(${column}) <= date(?)`); bindings.push(to); }
  return { sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "", bindings };
}

export async function GET(request: Request) {
  const user = await authorizedAdministrator(request);
  if (!user) return Response.json({ error: "Solo propietario o administración puede exportar reportes." }, { status: 403 });
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "occupation";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from > to)) return Response.json({ error: "El rango de fechas no es válido." }, { status: 400 });

  let result: { results: ReportRow[] };
  let filename = "reporte";
  if (type === "occupation") {
    result = await env.DB.prepare(`SELECT r.number AS Habitacion, f.name AS Piso, r.type AS Tipo, r.capacity AS Capacidad, r.status AS Estado,
      COALESCE(g.full_name, '') AS Huesped_titular, COALESCE(s.stay_type, '') AS Modalidad, COALESCE(s.check_in, '') AS Ingreso, COALESCE(s.expected_check_out, '') AS Salida_prevista
      FROM rooms r JOIN floors f ON f.id = r.floor_id LEFT JOIN stays s ON s.room_id = r.id AND s.status = 'ACTIVA' LEFT JOIN guests g ON g.id = s.primary_guest_id
      WHERE r.active = 1 ORDER BY f.position, CAST(r.number AS INTEGER), r.number`).all<ReportRow>();
    filename = "ocupacion-actual";
  } else if (type === "stays") {
    const filter = dateFilter("s.check_in", from, to);
    result = await env.DB.prepare(`SELECT s.id AS Estadia, g.full_name AS Huesped_titular, COALESCE(g.ci, 'Pendiente') AS CI, r.number AS Habitacion_actual,
      s.stay_type AS Modalidad, s.check_in AS Ingreso, COALESCE(s.expected_check_out, '') AS Salida_prevista, COALESCE(s.check_out, '') AS Salida_real, s.status AS Estado,
      (SELECT COUNT(*) FROM stay_guests sg WHERE sg.stay_id = s.id) AS Personas_registradas,
      (SELECT COUNT(*) FROM stay_room_segments seg WHERE seg.stay_id = s.id) AS Habitaciones_utilizadas
      FROM stays s JOIN guests g ON g.id = s.primary_guest_id JOIN rooms r ON r.id = s.room_id${filter.sql} ORDER BY s.check_in DESC LIMIT 10000`).bind(...filter.bindings).all<ReportRow>();
    filename = "estadias";
  } else if (type === "contracts") {
    const filter = dateFilter("c.start_date", from, to);
    result = await env.DB.prepare(`SELECT c.contract_number AS Contrato, g.full_name AS Huesped, r.number AS Habitacion_inicial, c.contract_type AS Tipo,
      c.start_date AS Inicio, COALESCE(c.end_date, '') AS Final, c.status AS Estado, c.created_by AS Registrado_por,
      (SELECT COUNT(*) FROM documents d WHERE d.contract_id = c.id) AS Respaldos, COALESCE(c.end_reason, '') AS Motivo_cierre
      FROM contracts c JOIN guests g ON g.id = c.primary_guest_id JOIN rooms r ON r.id = c.initial_room_id${filter.sql} ORDER BY c.start_date DESC LIMIT 10000`).bind(...filter.bindings).all<ReportRow>();
    filename = "contratos";
  } else if (type === "rooms") {
    const filter = dateFilter("seg.started_at", from, to);
    result = await env.DB.prepare(`SELECT r.number AS Habitacion, seg.stay_id AS Estadia, g.full_name AS Huesped_titular, seg.sequence AS Tramo,
      seg.started_at AS Inicio, COALESCE(seg.ended_at, '') AS Final, seg.start_reason AS Motivo_inicio, COALESCE(seg.end_reason, '') AS Motivo_final,
      seg.created_by AS Registrado_por, (SELECT COUNT(*) FROM documents d WHERE d.segment_id = seg.id) AS Archivos
      FROM stay_room_segments seg JOIN rooms r ON r.id = seg.room_id JOIN stays s ON s.id = seg.stay_id JOIN guests g ON g.id = s.primary_guest_id${filter.sql}
      ORDER BY seg.started_at DESC LIMIT 10000`).bind(...filter.bindings).all<ReportRow>();
    filename = "historial-habitaciones";
  } else if (type === "staff") {
    const filter = dateFilter("activity.created_at", from, to);
    result = await env.DB.prepare(`SELECT activity.created_at AS Fecha, activity.user_name AS Trabajador, activity.user_role AS Rol, activity.action AS Accion,
      activity.entity_type AS Entidad, COALESCE(activity.entity_id, '') AS Registro, COALESCE(r.number, '') AS Habitacion, activity.reason AS Motivo
      FROM audit_logs activity LEFT JOIN rooms r ON r.id = activity.room_id${filter.sql} ORDER BY activity.created_at DESC LIMIT 10000`).bind(...filter.bindings).all<ReportRow>();
    filename = "actividad-personal";
  } else return Response.json({ error: "Tipo de reporte no reconocido." }, { status: 400 });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv(result.results), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="hotel-asael-${filename}-${stamp}.csv"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
