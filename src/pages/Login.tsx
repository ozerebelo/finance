import { useState } from "react";
import { supabase } from "@/lib/backend";
import { Field, Notice } from "@/components/ui";
import { HouseArt } from "@/components/art";

export function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form className="card w-full max-w-sm p-7" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
        setBusy(false);
        if (r.error) setErr(r.error.message);
        else setSent(true);
      }}>
        <div className="flex justify-center"><HouseArt size={88} /></div>
        <h1 className="font-display text-[24px] font-extrabold text-center mt-2">Casa a Dois</h1>
        {sent ? (
          <div className="mt-5"><Notice>Enviámos um link para <b>{email}</b>. Abra-o neste dispositivo para entrar.</Notice></div>
        ) : (
          <div className="mt-5 grid gap-3">
            <Field label="E-mail">{(id) => <input id={id} type="email" required autoComplete="email" className="input h-11" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <button className="btn-primary h-11" disabled={busy}>{busy ? "A enviar…" : "Enviar link de entrada"}</button>
            <p className="text-muted text-[12px] text-center">Sem palavra-passe: recebe um link no e-mail.</p>
            {err && <Notice tone="bad">{err}</Notice>}
          </div>
        )}
      </form>
    </div>
  );
}
