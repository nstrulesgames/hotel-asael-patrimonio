import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!request.headers.get("oai-authenticated-user-id") && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Selecciona un archivo." }, { status: 400 });
  const roomId = Number(form.get("roomId"));
  const stayId = Number(form.get("stayId")) || null;
  const category = String(form.get("category") || "OTRO");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `hotel-asael/${roomId}/${stayId || "sin-estadia"}/${crypto.randomUUID()}-${safeName}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  await env.DB.prepare("INSERT INTO documents (room_id, stay_id, category, filename, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(roomId, stayId, category, file.name, key, file.type || "application/octet-stream", new Date().toISOString()).run();
  return Response.json({ ok: true });
}
