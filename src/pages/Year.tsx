import { useStore } from "@/lib/store";
import { monthTotals } from "@/lib/calc";
import { MONTHS_SHORT, fmtPct, pad, yearOf } from "@/lib/format";
import { Card, Money, PageHeader, cx } from "@/components/ui";

export default function Year() {
  const { db, month, hidden } = useStore();
  const y = yearOf(month);
  const rows = Array.from({ length: 12 }, (_, i) => monthTotals(db, `${y}-${pad(i + 1)}`));
  const max = Math.max(...rows.map((r) => Math.max(r.income, r.expenses)), 1);
  const tot = rows.reduce((a, r) => ({ income: a.income + r.income, expenses: a.expenses + r.expenses, left: a.left + r.left }), { income: 0, expenses: 0, left: 0 });
  const H = 180;
  return (
    <>
      <PageHeader title={`Relatório de ${y}`} sub="Rendimento e gastos mês a mês. Meses futuros mostram o previsto (salários e contas)." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[["Rendimento no ano", tot.income, ""], ["Gastos no ano", tot.expenses, ""], ["Sobra no ano", tot.left, tot.left >= 0 ? "text-good" : "text-bad"]].map(([l, v, c]) => (
          <div key={l as string} className="card px-5 py-4"><p className="label">{l}</p><p className={cx("font-display text-[24px] font-bold", c as string)}><Money value={v as number} /></p></div>
        ))}
      </div>
      <Card title="Mês a mês">
        <div className="mt-3 flex gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-good/70" />Rendimento</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" />Gastos</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[620px] grid-cols-12 gap-2 items-end border-b border-line" style={{ height: H + 24 }}>
            {rows.map((r, i) => (
              <div key={i} className="flex h-full flex-col justify-end items-center gap-1 group relative">
                {!hidden && <span className="absolute -top-0 text-[10.5px] text-muted opacity-0 group-hover:opacity-100 tnum">{Math.round(r.left)}</span>}
                <div className="flex w-full items-end justify-center gap-1">
                  <div className="w-[38%] rounded-t-md bg-good/70" style={{ height: (r.income / max) * H }} title={`Rendimento ${Math.round(r.income)} €`} />
                  <div className={cx("w-[38%] rounded-t-md", r.hasData ? "bg-brand" : "bg-brand/35")} style={{ height: (r.expenses / max) * H }} title={`Gastos ${Math.round(r.expenses)} €`} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid min-w-[620px] grid-cols-12 gap-2 mt-1.5 text-center text-[11.5px] text-muted">{MONTHS_SHORT.map((m) => <span key={m}>{m}</span>)}</div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead className="text-muted text-[12px]"><tr><th className="text-left font-medium py-1.5">Mês</th><th className="text-right font-medium">Rendimento</th><th className="text-right font-medium">Contas</th><th className="text-right font-medium">Dia a dia</th><th className="text-right font-medium">Sobra</th><th className="text-right font-medium">Taxa de poupança</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={cx("border-t border-line", !r.hasData && "text-muted")}>
                  <td className="py-2">{MONTHS_SHORT[i]}{!r.hasData && <span className="text-[11px]"> · previsto</span>}</td>
                  <td className="text-right"><Money value={r.income} /></td>
                  <td className="text-right"><Money value={r.bills} /></td>
                  <td className="text-right"><Money value={r.daily} /></td>
                  <td className={cx("text-right font-semibold", r.left < 0 && "text-bad")}><Money value={r.left} /></td>
                  <td className="text-right">{fmtPct(r.savingsRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
