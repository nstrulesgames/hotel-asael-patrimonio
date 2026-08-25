"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    const notice = new URLSearchParams(window.location.search).get("notice");
    if (error) setMessage(error);
    if (notice) setMessage(notice);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const returnTo = new URLSearchParams(window.location.search).get("return_to") || "/";
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error("Correo o contraseña incorrectos.");
      window.location.assign(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    if (!email.trim()) {
      setMessage("Primero escribe tu correo electrónico.");
      return;
    }
    setResetBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const raw = await response.text();
      let result: { error?: string } = {};
      if (raw) {
        try {
          result = JSON.parse(raw) as { error?: string };
        } catch {
          throw new Error("La dirección abierta no corresponde a la versión actual. Abre nuevamente el enlace de Vercel.");
        }
      }
      if (!response.ok) throw new Error(result.error || "El servidor no respondió correctamente. Intenta nuevamente.");
      setMessage("Revisa tu correo. Te enviamos un enlace para crear una contraseña.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la recuperación.");
    } finally {
      setResetBusy(false);
    }
  }

  return <main className="asael-login"><section className="asael-login-brand"><div className="brand-mark">A</div><p>Hotel</p><h1>ASAEL</h1><span>Gestión interna</span></section><section className="asael-login-card"><p className="eyebrow">Acceso del personal</p><h2>Inicia sesión</h2><p>Ingresa con el correo y la contraseña asignados por Administración.</p><form onSubmit={submit}><label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label><label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" /></label><button className="primary" disabled={busy || resetBusy}>{busy ? "Ingresando…" : "Ingresar"}</button><button className="asael-reset-link" type="button" disabled={busy || resetBusy} onClick={requestPasswordReset}>{resetBusy ? "Enviando…" : "Crear o recuperar contraseña"}</button></form>{message && <div className="asael-login-message" role="status">{message}</div>}<small>El acceso está limitado exclusivamente a trabajadores autorizados del Hotel ASAEL.</small></section></main>;
}
