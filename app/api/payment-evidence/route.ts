import { env } from "@/lib/runtime-env";

type EvidenceUser = { id: number; name: string; role: string };

async function currentUser(request: Request) {
  const url = new URL(request.url);
  const externalId = request.headers.get("oai-authenticated-user-id") || (url.hostname === "localhost" || url.hostname === "127.0.0.1" ? "local-owner" : "");
  const email = request.headers.get("oai-authenticated-user-email") || "propietario@hotelasael.local";
  if (!externalId) return null;
  return env.DB.prepare("SELECT id, name, role FROM users WHERE (external_id = ? OR lower(email) = lower(?)) AND active = 1 LIMIT 1").bind(externalId, email).first<EvidenceUser>();
}

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Tu correo no tiene acceso activo." }, { status: 403 });
  const evidenceId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(evidenceId) || evidenceId <= 0) return Response.json({ error: "Respaldo inválido." }, { status: 400 });
  const evidence = await env.DB.prepare("SELECT filename, object_key, content_type FROM payment_evidences WHERE id = ?").bind(evidenceId).first<{ filename: string; object_key: string; content_type: string }>();
  if (!evidence) return Response.json({ error: "El respaldo no existe." }, { status: 404 });
  const object = await env.FILES.get(evidence.object_key);
  if (!object) return Response.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  const safeName = evidence.filename.replace(/[\r\n"]/g, "-");
  return new Response(object.body, { headers: { "content-type": evidence.content_type, "content-disposition": `inline; filename="${safeName}"`, "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Tu correo no tiene acceso activo." }, { status: 403 });
  const form = await request.formData();
  const salePaymentId = Number(form.get("salePaymentId"));
  const files = [...form.getAll("files"), form.get("file")].filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!Number.isInteger(salePaymentId) || salePaymentId <= 0 || !files.length) return Response.json({ error: "Selecciona el pago y al menos un respaldo." }, { status: 400 });
  if (files.length > 3) return Response.json({ error: "Puedes adjuntar como máximo tres respaldos por pago." }, { status: 400 });
  if (files.some((file) => file.size > 15 * 1024 * 1024)) return Response.json({ error: "Cada respaldo debe pesar como máximo 15 MB." }, { status: 413 });
  if (files.some((file) => !file.type.startsWith("image/") && file.type !== "application/pdf")) return Response.json({ error: "Solo se permiten imágenes o PDF." }, { status: 415 });
  const payment = await env.DB.prepare("SELECT payment.id, payment.sale_id, payment.payment_method, sale.sale_number, sale.room_id FROM sale_payments payment JOIN sales sale ON sale.id = payment.sale_id WHERE payment.id = ?").bind(salePaymentId).first<{ id: number; sale_id: number; payment_method: string; sale_number: string; room_id: number | null }>();
  if (!payment) return Response.json({ error: "El pago no existe." }, { status: 404 });
  if (!["TRANSFERENCIA", "QR", "OTRO"].includes(payment.payment_method)) return Response.json({ error: "Este tipo de pago no requiere respaldo digital." }, { status: 400 });
  const evidenceIds: number[] = [];
  const now = new Date().toISOString();
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const key = `hotel-asael/pagos/${payment.sale_number}/${salePaymentId}/${crypto.randomUUID()}-${safeName}`;
    await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const inserted = await env.DB.prepare("INSERT INTO payment_evidences (sale_payment_id, filename, object_key, content_type, uploaded_by_user_id, uploaded_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(salePaymentId, file.name, key, file.type || "application/octet-stream", user.id, user.name, now).run();
    evidenceIds.push(Number(inserted.meta.last_row_id));
  }
  await env.DB.prepare("INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, room_id, new_value, reason, created_at) VALUES (?, ?, ?, 'RESPALDO_PAGO_CARGADO', 'SALE_PAYMENT', ?, ?, ?, ?, ?)").bind(user.id, user.name, user.role, salePaymentId, payment.room_id, JSON.stringify({ evidenceIds }), `Respaldo digital de ${payment.sale_number}`, now).run();
  return Response.json({ ok: true, evidenceIds, evidenceId: evidenceIds[0] });
}
