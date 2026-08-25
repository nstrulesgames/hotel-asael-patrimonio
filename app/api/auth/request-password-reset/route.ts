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

  const callback = new URL("/auth/confirm", request.url);
  callback.searchParams.set("next", "/restablecer-contrasena");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(authorized.email, {
    redirectTo: callback.toString(),
  });
  if (error) {
    console.error("Supabase password recovery request failed", error);
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return Response.json(
        { error: "El servicio de correo alcanzó su límite temporal. Espera unos minutos y vuelve a intentarlo una sola vez." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
    return Response.json({ error: "No se pudo enviar la recuperación. Intenta nuevamente en unos minutos." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
