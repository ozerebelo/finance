import { useStore } from "@/lib/store";
import { catById, categoryActuals, highlights, monthTotals, spendingByMember, topExpenses } from "@/lib/calc";
import { addMonths, fmtDate, monthLabel } from "@/lib/format";
import { Card, Money, PageHeader, cx } from "@/components/ui";

function Delta({ cur, prev, goodWhenUp }: { cur: number; prev: number; goodWhenUp: boolean }) {
  const d = cur - prev;
  if (Math.abs(d) < 0.5) return <span className="text-muted text-[12px]">igual</span>;
  const good = goodWhenUp ? d > 0 : d < 0;
  return <span className={cx("text-[12px] font-semibold", good ? "text-good" : "text-bad")}>{d > 0 ? "▲" : "▼"} <Money value={Math.abs(d)} /></span>;
}

export default function Review() {
  const { db, month } = useStore();
  const cur = monthTotals(db, month);
  const prev = monthTotals(db, addMonths(month, -1));
  const cats = catById(db);
  const actual = categoryActuals(db, month);
  const prevActual = categoryActuals(db, addMonths(month, -1));
  const byCat = db.category
    .filter((c) => c.kind === "expense")
    .map((c) => ({ c, a: -(actual.get(c.id) ?? 0), p: -(prevActual.get(c.id) ?? 0) }))
    .filter((x) => x.a || x.p)
    .sort((a, b) => b.a - a.a);
  const people = spendingByMember(db, month);
  const maxP = Math.max(...people.map((p) => p.amount), 1);
  return (
    <>
      <PageHeader title={`Revisão de ${monthLabel(month).toLowerCase()}`} sub="A agenda para a vossa conversa de fim de mês." />
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-2 items-start">
        <Card title="Destaques" className="lg:col-span-2">
          <ul className="mt-2 grid gap-2">
            {highlights(db, month).map((h) => (
              <li key={h} className="flex gap-2 text-[14px]"><span className="text-brand">•</span>{h}</li>
            ))}
          </ul>
        </Card>
        <Card title="Face ao mês anterior">
          <table className="mt-2 w-full text-[13.5px]">
            <thead className="text-muted text-[12px]"><tr><th className="text-left font-medium py-1" /><th className="text-right font-medium">Este mês</th><th className="text-right font-medium">Anterior</th><th className="text-right font-medium w-28" /></tr></thead>
            <tbody>
              {([["Rendimento", "income", true], ["Contas", "bills", false], ["Dia a dia", "daily", false], ["Sobra", "left", true]] as const).map(([l, k, up]) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-2.5 font-medium">{l}</td>
                  <td className="text-right font-semibold"><Money value={cur[k]} /></td>
                  <td className="text-right text-muted"><Money value={prev[k]} /></td>
                  <td className="text-right"><Delta cur={cur[k]} prev={prev[k]} goodWhenUp={up} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Por pessoa (despesas)">
          <ul className="mt-3 grid gap-3">
            {people.map((p) => (
              <li key={p.id ?? "joint"}>
                <div className="flex justify-between text-[13.5px]"><span>{p.name}</span><Money value={p.amount} className="font-semibold" /></div>
                <div className="mt-1 h-2 rounded-full bg-sunk"><div className="h-full rounded-full bg-brand" style={{ width: (p.amount / maxP) * 100 + "%" }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Por categoria">
          {byCat.length === 0 ? <p className="text-muted text-[13px] mt-2">Sem despesas categorizadas.</p> : (
            <ul className="mt-2">
              {byCat.map(({ c, a, p }) => (
                <li key={c.id} className="row-line flex items-center gap-3 py-2 text-[13.5px]">
                  <span className="flex-1 truncate">{c.name}</span>
                  <Money value={a} className="font-semibold" />
                  <span className="w-24 text-right"><Delta cur={a} prev={p} goodWhenUp={false} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="As 5 maiores despesas">
          <ol className="mt-2">
            {topExpenses(db, month).map((t, i) => (
              <li key={t.id} className="row-line flex items-center gap-3 py-2.5 text-[13.5px]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-sunk text-[12px] font-bold">{i + 1}</span>
                <span className="flex-1 min-w-0"><span className="block truncate font-medium">{t.description}</span><span className="text-[11.5px] text-muted">{fmtDate(t.date)} · {t.categoryId ? cats.get(t.categoryId)?.name : "Sem categoria"}</span></span>
                <Money value={-t.amount} className="font-semibold" />
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
