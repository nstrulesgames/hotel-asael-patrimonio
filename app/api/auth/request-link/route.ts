import { env } from "@/lib/runtime-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthorizedEmail = { name: string; email: string };

export async function POST(request: Request) {
  let body: { email?: unknown; returnTo?: unknown };
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
    "SELECT name, email FROM users WHERE lower(email) = lower(?) AND active = 1 LIMIT 1",
  ).bind(email).first<AuthorizedEmail>();
  if (!authorized) {
    return Response.json({ error: "Este correo no tiene acceso activo al Hotel ASAEL." }, { status: 403 });
  }

  const returnTo = String(body.returnTo || "/");
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const callback = new URL("/auth/confirm", request.url);
  callback.searchParams.set("next", safeReturnTo);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: authorized.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callback.toString(),
      data: { full_name: authorized.name },
    },
  });
  if (error) {
    console.error("Supabase magic-link request failed", error);
    return Response.json({ error: "No se pudo enviar el enlace. Intenta nuevamente en unos minutos." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
