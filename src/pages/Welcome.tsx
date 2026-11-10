import { useState } from "react";
import { FileUp, Sparkles, Wand2, MonitorSmartphone } from "lucide-react";
import { fromBackup } from "@/lib/backup";
import { demoHousehold, newHousehold } from "@/lib/seed";
import { normalise } from "@/lib/backend";
import type { DB } from "@/lib/types";
import { Field, NumberInput, Notice, Toggle, cx } from "@/components/ui";
import { HouseArt } from "@/components/art";

type Person = { name: string; salary: number | null; jointContribution: number | null; subsidies: boolean };

export function Welcome({ onDone, cloud, localData }: { onDone: (db: DB) => Promise<void> | void; cloud?: boolean; localData?: string | null }) {
  const [step, setStep] = useState<"choose" | "wizard">("choose");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [house, setHouse] = useState("Casa a Dois");
  const [people, setPeople] = useState<Person[]>([
    { name: "", salary: null, jointContribution: null, subsidies: true },
    { name: "", salary: null, jointContribution: null, subsidies: true },
  ]);
  const run = async (db: DB) => {
    setBusy(true);
    try {
      await onDone(db);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const setP = (i: number, patch: Partial<Person>) => setPeople((ps) => ps.map((p, j) => (i === j ? { ...p, ...patch } : p)));

  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <div className="card w-full max-w-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight">Casa a Dois</h1>
            <p className="text-muted mt-1">As finanças da casa, a dois. Vamos configurar a vossa casa.</p>
          </div>
          <HouseArt size={80} />
        </div>
        {err && <div className="mt-4"><Notice tone="bad">{err}</Notice></div>}
        {step === "choose" ? (
          <div className="mt-6 grid gap-3">
            {cloud && localData && (
              <button disabled={busy} onClick={() => { try { run(normalise(JSON.parse(localData))); } catch { setErr("Não consegui ler os dados deste navegador."); } }} className="flex items-start gap-3 rounded-xl border border-brand bg-brand-soft p-4 text-left">
                <MonitorSmartphone className="text-brand mt-0.5" size={20} />
                <span><b>Trazer os dados deste navegador</b><span className="block text-muted text-[13px]">Já usou a app em modo local neste dispositivo. Passa tudo para a nuvem.</span></span>
              </button>
            )}
            <label className={cx("flex items-start gap-3 rounded-xl border p-4 cursor-pointer hover:border-brand", !(cloud && localData) && "border-brand bg-brand-soft")}>
              <FileUp className="text-brand mt-0.5" size={20} />
              <span className="flex-1">
                <b>Usar um ficheiro de configuração</b>
                <span className="block text-muted text-[13px]">Um ficheiro .json com as vossas pessoas, contas e bancos (ou uma cópia de segurança).</span>
              </span>
              <input type="file" accept=".json,application/json" className="sr-only" disabled={busy} onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { await run(fromBackup(await f.text())); } catch (x) { setErr((x as Error).message); }
              }} />
            </label>
            <button disabled={busy} onClick={() => setStep("wizard")} className="flex items-start gap-3 rounded-xl border border-line p-4 text-left hover:border-brand">
              <Wand2 className="text-brand mt-0.5" size={20} />
              <span><b>Começar do zero</b><span className="block text-muted text-[13px]">Nomes, salários e quanto cada um põe na conta conjunta. O resto adiciona depois.</span></span>
            </button>
            {!cloud && (
              <button disabled={busy} onClick={() => run(demoHousehold())} className="flex items-start gap-3 rounded-xl border border-line p-4 text-left hover:border-brand">
                <Sparkles className="text-brand mt-0.5" size={20} />
                <span><b>Explorar com dados de exemplo</b><span className="block text-muted text-[13px]">Números inventados, para ver como funciona. Pode apagar depois em Preferências.</span></span>
              </button>
            )}
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={(e) => {
            e.preventDefault();
            if (people.some((p) => !p.name.trim())) return setErr("Indique o nome das duas pessoas.");
            run(newHousehold({ householdName: house, people: people.map((p) => ({ name: p.name.trim(), salary: p.salary ?? 0, jointContribution: p.jointContribution ?? 0, subsidies: p.subsidies, email: null })) }));
          }}>
            <Field label="Nome da casa">{(id) => <input id={id} className="input" value={house} onChange={(e) => setHouse(e.target.value)} />}</Field>
            {people.map((p, i) => (
              <fieldset key={i} className="rounded-xl border border-line p-4 grid sm:grid-cols-3 gap-3">
                <legend className="px-1 text-[12.5px] font-semibold text-muted">Pessoa {i + 1}</legend>
                <Field label="Nome">{(id) => <input id={id} className="input" value={p.name} onChange={(e) => setP(i, { name: e.target.value })} />}</Field>
                <Field label="Salário líquido (€)">{(id) => <NumberInput id={id} value={p.salary} onChange={(n) => setP(i, { salary: n })} />}</Field>
                <Field label="Põe na conjunta (€)">{(id) => <NumberInput id={id} value={p.jointContribution} onChange={(n) => setP(i, { jointContribution: n })} />}</Field>
                <div className="sm:col-span-3"><Toggle checked={p.subsidies} onChange={(v) => setP(i, { subsidies: v })} label="Recebe subsídios de férias e Natal à parte (14 meses)" /></div>
              </fieldset>
            ))}
            <div className="flex justify-between gap-2">
              <button type="button" className="btn-ghost" onClick={() => setStep("choose")}>Voltar</button>
              <button className="btn-primary" disabled={busy}>Criar a nossa casa</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
