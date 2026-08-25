"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RestablecerContrasenaPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("Comprobando el enlace seguro…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setReady(Boolean(data.user));
      setMessage(data.user ? "" : "El enlace venció o no es válido. Solicita uno nuevo.");
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 10 || password.length > 72) {
      setMessage("La contraseña debe tener entre 10 y 72 caracteres.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.assign("/signin-with-chatgpt?notice=Contraseña guardada. Ya puedes iniciar sesión.");
    } catch {
      setMessage("No se pudo guardar la contraseña. Solicita un enlace nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="asael-login"><section className="asael-login-brand"><div className="brand-mark">A</div><p>Hotel</p><h1>ASAEL</h1><span>Acceso seguro</span></section><section className="asael-login-card"><p className="eyebrow">Contraseña personal</p><h2>Crear contraseña</h2><p>Esta será la contraseña que usarás junto con tu correo para ingresar al sistema.</p>{ready && <form onSubmit={submit}><label>Nueva contraseña<input type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 10 caracteres" /></label><label>Repetir contraseña<input type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repite la contraseña" /></label><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button></form>}{message && <div className="asael-login-message" role="status">{message}</div>}<small>Supabase protege la contraseña; el Hotel ASAEL no puede verla.</small></section></main>;
}
