import { env } from "@/lib/runtime-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }

  const authorized = await env.DB.prepare(
    "SELECT email FROM users WHERE lower(email) = lower(?) AND active = 1 LIMIT 1",
  ).bind(email).first<{ email: string }>();
  if (!authorized) {
    return Response.json({ error: "Este correo no tiene acceso activo al Hotel ASAEL." }, { status: 403 });
  }

  return Response.json({ ok: true, email: authorized.email });
}
