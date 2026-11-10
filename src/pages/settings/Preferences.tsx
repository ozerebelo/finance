import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { settingsOf } from "@/lib/calc";
import { supabase } from "@/lib/backend";
import { downloadText, fromBackup, toBackup } from "@/lib/backup";
import { todayISO } from "@/lib/format";
import { Card, Field, NumberInput, Notice, PageHeader } from "@/components/ui";

function Members() {
  const { householdId } = useStore();
  const [list, setList] = useState<{ email: string; user_id: string | null }[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const load = async () => {
    if (!supabase || !householdId) return;
    const r = await supabase.from("memberships").select("email,user_id").eq("household_id", householdId);
    setList(r.data ?? []);
  };
  useEffect(() => { load(); }, [householdId]); // eslint-disable-line react-hooks/exhaustive-deps
  const invite = async () => {
    if (!supabase || !householdId || !email.includes("@")) return;
    const r = await supabase.from("memberships").insert({ household_id: householdId, email: email.trim().toLowerCase() });
    setMsg(r.error ? "Não foi possível convidar: " + r.error.message : `Convite criado. Peça a ${email} para entrar na app com este e-mail.`);
    setEmail("");
    load();
  };
  return (
    <Card title="Quem tem acesso">
      <ul className="mt-2 mb-4">
        {list.map((m) => (
          <li key={m.email} className="row-line flex justify-between py-2 text-[13.5px]">
            <span>{m.email}</span>
            <span className={m.user_id ? "text-good" : "text-warn"}>{m.user_id ? "ativo" : "convite pendente"}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 max-w-md">
        <input className="input" type="email" placeholder="e-mail da outra pessoa" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail para convidar" />
        <button className="btn-primary" onClick={invite}>Convidar</button>
      </div>
      {msg && <p className="mt-2 text-[12.5px] text-muted">{msg}</p>}
      <p className="text-muted text-[12px] mt-3">Em Ajustes → Nossa renda, ponha o mesmo e-mail na pessoa certa para a app saber quem é quem.</p>
    </Card>
  );
}

export default function Preferences() {
  const { db, save, mode, replaceAll } = useStore();
  const s = settingsOf(db);
  const set = (patch: Partial<typeof s>) => save("settings", { ...s, ...patch, id: "settings" });
  const [restore, setRestore] = useState<{ name: string; db: ReturnType<typeof fromBackup> } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [name, setName] = useState(s.householdName);
  useEffect(() => setName(s.householdName), [s.householdName]);

  return (
    <>
      <PageHeader title="Preferências" />
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <Card title="Geral">
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Nome da casa">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== s.householdName && set({ householdName: name })} />}</Field>
            <Field label="Cor principal">{(id) => <input id={id} type="color" className="h-9 w-16 rounded-lg border border-line bg-surface p-1" value={s.brandColor} onChange={(e) => set({ brandColor: e.target.value })} />}</Field>
            <Field label="Referência de habitação (% do salário)">{(id) => <NumberInput id={id} value={s.housingRefPct} onChange={(n) => n != null && set({ housingRefPct: n })} />}</Field>
            <Field label="Objetivo do fundo de emergência (€)">{(id) => <NumberInput id={id} allowEmpty value={s.reserveTarget} onChange={(n) => set({ reserveTarget: n })} placeholder="ex. 10 000" />}</Field>
            <Field label="Avisar contas com quantos dias de antecedência">{(id) => <NumberInput id={id} value={s.reminderDays} onChange={(n) => n != null && set({ reminderDays: Math.max(0, Math.round(n)) })} />}</Field>
          </div>
        </Card>
        {mode === "supabase" ? (
          <Members />
        ) : (
          <Card title="Partilhar com a outra pessoa">
            <Notice tone="warn">Os dados estão guardados só neste navegador.</Notice>
            <p className="text-[13px] mt-3">Para usarem os dois, cada um no seu telemóvel, ligue a app ao Supabase (gratuito). Os passos estão no ficheiro <b>README</b> do projeto. Depois de ligar, ao entrar pela primeira vez pode trazer os dados deste navegador.</p>
          </Card>
        )}
        <Card title="Cópia de segurança">
          <p className="text-muted text-[12.5px] mt-1">Guarda tudo num ficheiro .json. Serve também para mudar de navegador ou para começar com um ficheiro de configuração.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => downloadText(`casa-a-dois-${todayISO()}.json`, toBackup(db))}><Download size={15} /> Descarregar cópia</button>
            <label className="btn-ghost cursor-pointer">
              <Upload size={15} /> Restaurar de ficheiro
              <input type="file" accept=".json,application/json" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try { setRestore({ name: f.name, db: fromBackup(await f.text()) }); setErr(null); } catch (x) { setErr((x as Error).message); }
              }} />
            </label>
          </div>
          {err && <p className="text-bad text-[13px] mt-2">{err}</p>}
          {done && <p className="text-good text-[13px] mt-2">{done}</p>}
          {restore && (
            <div className="mt-3 rounded-xl bg-warn/10 p-3 text-[13px]">
              <p>Substituir <b>todos</b> os dados atuais pelo conteúdo de <b>{restore.name}</b> ({restore.db.member.map((m) => m.name).join(" e ")}, {restore.db.transaction.length} movimentos)?</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={async () => { await replaceAll(restore.db); setRestore(null); setDone("Dados restaurados."); }}>Substituir</button>
                <button className="btn-ghost" onClick={() => setRestore(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
