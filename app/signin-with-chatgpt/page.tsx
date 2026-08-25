"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const returnTo = new URLSearchParams(window.location.search).get("return_to") || "/";
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), returnTo }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el enlace de acceso.");
      setMessage("Te enviamos un enlace seguro. Revisa tu correo para ingresar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el enlace de acceso.");
    } finally { setBusy(false); }
  }

  return <main className="asael-login"><section className="asael-login-brand"><div className="brand-mark">A</div><p>Hotel</p><h1>ASAEL</h1><span>Gestión interna</span></section><section className="asael-login-card"><p className="eyebrow">Acceso del personal</p><h2>Ingresa con tu correo</h2><p>Usa el correo que Administración registró para ti. No necesitas recordar una contraseña.</p><form onSubmit={submit}><label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label><button className="primary" disabled={busy}>{busy ? "Enviando…" : "Enviar enlace de acceso"}</button></form>{message && <div className="asael-login-message" role="status">{message}</div>}<small>El acceso está limitado exclusivamente a trabajadores autorizados del Hotel ASAEL.</small></section></main>;
}

