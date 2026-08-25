import { env } from "@/lib/runtime-env";

type EvidenceUser = { id: number; name: string; role: string };

async function administrator(request: Request) {
  const url = new URL(request.url);
  const externalId = request.headers.get("oai-authenticated-user-id") || (["localhost", "127.0.0.1"].includes(url.hostname) ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  if (!externalId) return null;
  const user = await env.DB.prepare("SELECT id, name, role FROM users WHERE (external_id = ? OR lower(email) = lower(?)) AND active = 1 LIMIT 1").bind(externalId, email).first<EvidenceUser>();
  return user && ["PROPIETARIO", "ADMINISTRADOR"].includes(user.role) ? user : null;
}

export async function GET(request: Request) {
  const user = await administrator(request);
  if (!user) return Response.json({ error: "Solo Administración puede consultar comprobantes de compra." }, { status: 403 });
  const movementId = Number(new URL(request.url).searchParams.get("movementId"));
  if (!Number.isInteger(movementId) || movementId <= 0) return Response.json({ error: "Ingreso inválido." }, { status: 400 });
  const movement = await env.DB.prepare("SELECT receipt_filename, receipt_object_key, receipt_content_type FROM stock_movements WHERE id = ? AND movement_type = 'ENTRADA'").bind(movementId).first<{ receipt_filename: string | null; receipt_object_key: string | null; receipt_content_type: string | null }>();
  if (!movement?.receipt_object_key) return Response.json({ error: "Este ingreso no tiene comprobante adjunto." }, { status: 404 });
  const object = await env.FILES.get(movement.receipt_object_key);
  if (!object) return Response.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  const safeName = String(movement.receipt_filename || "comprobante").replace(/[\r\n"]/g, "-");
  return new Response(object.body, { headers: { "content-type": movement.receipt_content_type || "application/octet-stream", "content-disposition": `inline; filename="${safeName}"`, "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await administrator(request);
  if (!user) return Response.json({ error: "Solo Administración puede cargar comprobantes de compra." }, { status: 403 });
  const form = await request.formData();
  const movementId = Number(form.get("movementId"));
  const file = form.get("file");
  if (!Number.isInteger(movementId) || movementId <= 0 || !(file instanceof File) || !file.size) return Response.json({ error: "Selecciona el ingreso y un comprobante." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "El comprobante debe pesar como máximo 15 MB." }, { status: 413 });
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") return Response.json({ error: "Solo se permiten imágenes o PDF." }, { status: 415 });
  const movement = await env.DB.prepare("SELECT id, product_id, receipt_object_key FROM stock_movements WHERE id = ? AND movement_type = 'ENTRADA'").bind(movementId).first<{ id: number; product_id: number; receipt_object_key: string | null }>();
  if (!movement) return Response.json({ error: "El ingreso de almacén no existe." }, { status: 404 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `hotel-asael/compras/${movementId}/${crypto.randomUUID()}-${safeName}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  await env.DB.batch([
    env.DB.prepare("UPDATE stock_movements SET receipt_filename = ?, receipt_object_key = ?, receipt_content_type = ? WHERE id = ?").bind(file.name, key, file.type || "application/octet-stream", movementId),
    env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, new_value, reason, created_at) VALUES (?, ?, ?, 'COMPROBANTE_COMPRA_CARGADO', 'STOCK_MOVEMENT', ?, ?, 'Respaldo de ingreso de almacén', ?)").bind(user.id, user.name, user.role, movementId, file.name, new Date().toISOString()),
  ]);
  if (movement.receipt_object_key && movement.receipt_object_key !== key) await env.FILES.delete(movement.receipt_object_key);
  return Response.json({ ok: true, movementId });
}
