import { env } from "cloudflare:workers";

const allowedCategories = new Set([
  "VISTA_GENERAL", "CAMA", "MUEBLES", "BANO", "TELEVISION", "VENTILADOR", "DANOS", "OTRA_EVIDENCIA",
  "CONTRATO", "ACTA_ENTREGA_FIRMADA", "ACTA_DEVOLUCION_FIRMADA",
  "TRABAJO_ANTES", "TRABAJO_DESPUES",
]);

async function authorizedUser(request: Request) {
  const url = new URL(request.url);
  const externalId = request.headers.get("oai-authenticated-user-id") || (url.hostname === "localhost" || url.hostname === "127.0.0.1" ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  if (!externalId) return null;
  const user = await env.DB.prepare("SELECT id, name, active, external_id FROM users WHERE external_id = ? OR lower(email) = lower(?) LIMIT 1").bind(externalId, email).first<{ id: number; name: string; active: number; external_id: string }>();
  if (!user?.active) return null;
  if (user.external_id.startsWith("pending:")) await env.DB.prepare("UPDATE users SET external_id = ? WHERE id = ?").bind(externalId, user.id).run();
  return user;
}

export async function GET(request: Request) {
  const user = await authorizedUser(request);
  if (!user) return Response.json({ error: "Correo no autorizado." }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "Documento inválido." }, { status: 400 });
  const document = await env.DB.prepare("SELECT filename, object_key, content_type FROM documents WHERE id = ?").bind(id).first<{ filename: string; object_key: string; content_type: string }>();
  if (!document) return Response.json({ error: "Documento inexistente." }, { status: 404 });
  const object = await env.FILES.get(document.object_key);
  if (!object) return Response.json({ error: "El archivo no está disponible." }, { status: 404 });
  const safeName = document.filename.replace(/[\r\n\"]/g, "-");
  return new Response(object.body, { headers: { "content-type": document.content_type, "content-disposition": `inline; filename="${safeName}"`, "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await authorizedUser(request);
  if (!user) return Response.json({ error: "Correo no autorizado." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecciona un archivo." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "El archivo supera el máximo de 15 MB." }, { status: 413 });
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") return Response.json({ error: "Solo se permiten imágenes o PDF." }, { status: 415 });
  let roomId = Number(form.get("roomId"));
  let stayId = Number(form.get("stayId")) || null;
  let segmentId = Number(form.get("segmentId")) || null;
  const workOrderId = Number(form.get("workOrderId")) || null;
  const phase = ["GENERAL", "ENTREGA", "DEVOLUCION"].includes(String(form.get("phase"))) ? String(form.get("phase")) : "GENERAL";
  const category = String(form.get("category") || "OTRA_EVIDENCIA");
  if (!roomId || !allowedCategories.has(category)) return Response.json({ error: "Habitación o categoría inválida." }, { status: 400 });
  if (workOrderId) {
    const order = await env.DB.prepare("SELECT room_id, stay_id, segment_id FROM work_orders WHERE id = ?").bind(workOrderId).first<{ room_id: number; stay_id: number | null; segment_id: number | null }>();
    if (!order || order.room_id !== roomId) return Response.json({ error: "La tarea no corresponde a esta habitación." }, { status: 409 });
    roomId = order.room_id;
    stayId = order.stay_id;
    segmentId = order.segment_id;
    if (!["TRABAJO_ANTES", "TRABAJO_DESPUES"].includes(category)) return Response.json({ error: "Selecciona evidencia de antes o después del trabajo." }, { status: 400 });
  } else if (["TRABAJO_ANTES", "TRABAJO_DESPUES"].includes(category)) {
    return Response.json({ error: "La evidencia debe asociarse a una tarea." }, { status: 400 });
  }
  if (stayId) {
    const stay = await env.DB.prepare("SELECT id FROM stays WHERE id = ? AND room_id = ?").bind(stayId, roomId).first();
    const segment = segmentId ? await env.DB.prepare("SELECT id FROM stay_room_segments WHERE id = ? AND stay_id = ? AND room_id = ?").bind(segmentId, stayId, roomId).first() : null;
    if (!stay && !segment) return Response.json({ error: "La estadía no corresponde a esta habitación." }, { status: 409 });
    if (!segment) return Response.json({ error: "Selecciona el segmento correcto de la estadía." }, { status: 409 });
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `hotel-asael/${roomId}/${stayId || "sin-estadia"}/${workOrderId ? "tarea-" + workOrderId : "habitacion"}/${crypto.randomUUID()}-${safeName}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  const result = await env.DB.prepare("INSERT INTO documents (room_id, stay_id, segment_id, work_order_id, phase, category, filename, object_key, content_type, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(roomId, stayId, segmentId, workOrderId, phase, category, file.name, key, file.type || "application/octet-stream", user.name, new Date().toISOString()).run();
  return Response.json({ ok: true, documentId: Number(result.meta.last_row_id) });
}
