import { useStore } from "@/lib/store";
import { annualMonthly, settingsOf } from "@/lib/calc";
import { MONTHS_SHORT, fmtPct, todayISO, uid } from "@/lib/format";
import type { Goal, Investment } from "@/lib/types";
import { Bar, BigMoney, Card, Field, Money, NumberInput, PageHeader, cx } from "@/components/ui";
import { EditTable, type Col } from "@/components/EditTable";
import { PiggyArt, ChartArt } from "@/components/art";

export default function Reserve() {
  const { db, save } = useStore();
  const s = settingsOf(db);
  const reserve = db.goal.find((g) => g.kind === "reserve");
  const goals = db.goal.filter((g) => g.kind === "goal");
  const invested = db.investment.reduce((a, i) => a + i.invested, 0);
  const value = db.investment.reduce((a, i) => a + i.currentValue, 0);
  const owners: [string, string][] = db.member.map((m) => [m.id, m.name]);

  const goalCols: Col<Goal>[] = [
    { key: "name", label: "Objetivo", type: "text", placeholder: "ex. Férias 2027" },
    { key: "target", label: "Valor (€)", type: "number", width: "120px" },
    { key: "saved", label: "Já tenho (€)", type: "number", width: "120px" },
    { key: "targetDate", label: "Até", type: "text", width: "120px", placeholder: "2027-07" },
    { key: "id", label: "Progresso", type: "text", width: "140px", render: (g) => <div className="px-2"><Bar value={g.saved} max={g.target || 1} tone="good" /><p className="text-[11px] text-muted mt-1">{g.target ? fmtPct(g.saved / g.target) : "—"}</p></div> },
  ];
  const invCols: Col<Investment>[] = [
    { key: "kind", label: "Tipo", type: "select", width: "130px", options: [["PPR", "PPR"], ["ETF", "ETF"], ["Certificados", "Certificados"], ["Ações", "Ações"], ["Outro", "Outro"]] },
    { key: "name", label: "Nome", type: "text", placeholder: "ex. VWCE na Trade Republic" },
    { key: "ownerId", label: "De quem", type: "select", width: "130px", emptyLabel: "Casal", options: owners },
    { key: "invested", label: "Investido (€)", type: "number", width: "120px" },
    { key: "currentValue", label: "Vale hoje (€)", type: "number", width: "120px" },
    { key: "updatedOn", label: "Atualizado", type: "text", width: "110px" },
  ];

  return (
    <>
      <PageHeader title="Nossa reserva" sub="Fundo de emergência, objetivos, investimentos e o fundo para as contas anuais." />
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-2 items-start">
        <Card title="Fundo de emergência" art={<PiggyArt size={90} />}>
          <BigMoney value={reserve?.saved ?? 0} className="mt-3 block" />
          <p className="text-muted text-[12.5px] mt-1.5">{s.reserveTarget ? <>Objetivo: <Money value={s.reserveTarget} /> · {fmtPct((reserve?.saved ?? 0) / s.reserveTarget)}</> : "Ainda sem objetivo definido."}</p>
          {s.reserveTarget ? <Bar className="mt-3" value={reserve?.saved ?? 0} max={s.reserveTarget} tone="good" /> : null}
          <div className="mt-5 grid grid-cols-2 gap-3 max-w-md">
            <Field label="Valor na reserva hoje (€)">
              {(id) => <NumberInput id={id} value={reserve?.saved ?? 0} onChange={(n) => save("goal", { ...(reserve ?? { id: uid(), name: "Fundo de emergência", kind: "reserve", target: null, targetDate: null, accountId: null }), saved: n ?? 0 } as Goal)} />}
            </Field>
            <Field label="Objetivo (€)">
              {(id) => <NumberInput id={id} allowEmpty value={s.reserveTarget} onChange={(n) => save("settings", { ...s, id: "settings", reserveTarget: n })} placeholder="ex. 10 000" />}
            </Field>
          </div>
        </Card>
        <Card title="Investimentos" art={<ChartArt size={80} />}>
          <BigMoney value={value} className="mt-3 block" />
          <p className={cx("text-[12.5px] mt-1.5 font-semibold", value - invested >= 0 ? "text-good" : "text-bad")}>
            {value - invested >= 0 ? "+" : ""}<Money value={value - invested} /> <span className="text-muted font-normal">sobre <Money value={invested} /> investidos</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["PPR", "ETF", "Certificados"] as const).map((k) => {
              const v = db.investment.filter((i) => i.kind === k).reduce((a, i) => a + i.currentValue, 0);
              return <span key={k} className="chip bg-sunk text-fg">{k}: <Money value={v} /></span>;
            })}
          </div>
        </Card>
        <Card title="Investimentos · detalhe" className="lg:col-span-2">
          <p className="text-muted text-[12.5px] mb-3">Atualize o valor de vez em quando (ex. no fim do mês). Não é preciso ser exato.</p>
          <EditTable kind="investment" rows={db.investment} cols={invCols} empty="Ainda sem investimentos registados." addLabel="Adicionar investimento" make={() => ({ id: uid(), ownerId: db.member[0]?.id ?? null, kind: "ETF", name: "", invested: 0, currentValue: 0, updatedOn: todayISO(), accountId: null })} minWidth={760} />
        </Card>
        <Card title="Objetivos de poupança" className="lg:col-span-2">
          <EditTable kind="goal" rows={goals} cols={goalCols} empty="Sem objetivos ainda: férias, carro, casa…" addLabel="Adicionar objetivo" make={() => ({ id: uid(), name: "", kind: "goal", target: null, targetDate: null, saved: 0, accountId: null })} />
        </Card>
        <Card title="Fundo das contas anuais" className="lg:col-span-2">
          <p className="text-muted text-[12.5px]">Pôr de lado <Money value={annualMonthly(db, "all")} className="font-semibold text-fg" /> por mês cobre todas as contas anuais. Edite valores e datas em Ajustes → Contas anuais.</p>
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {db.annualBill.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted text-[12px]">{a.dueMonth ? MONTHS_SHORT[a.dueMonth - 1] : "mês?"}</span>
                </div>
                {a.amount == null ? (
                  <p className="text-warn text-[12.5px] mt-1 font-semibold">Falta indicar o valor</p>
                ) : (
                  <>
                    <Bar className="mt-2" value={a.setAside} max={a.amount} tone={a.setAside >= a.amount ? "good" : "brand"} />
                    <p className="text-[12px] text-muted mt-1"><Money value={a.setAside} /> de <Money value={a.amount} /></p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
