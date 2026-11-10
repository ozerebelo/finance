import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { categoryActuals } from "@/lib/calc";
import { fmtPct, monthLabel } from "@/lib/format";
import { Bar, Card, Money, NumberInput, PageHeader, cx } from "@/components/ui";

export default function Budget() {
  const { db, month, save } = useStore();
  const actual = categoryActuals(db, month);
  const groups = useMemo(() => {
    const m = new Map<string, typeof db.category>();
    for (const c of db.category.filter((c) => c.kind === "expense")) {
      if (!m.has(c.group)) m.set(c.group, []);
      m.get(c.group)!.push(c);
    }
    return [...m.entries()];
  }, [db.category]);
  const totalBudget = db.category.filter((c) => c.kind === "expense").reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalSpent = db.category.filter((c) => c.kind === "expense").reduce((s, c) => s - (actual.get(c.id) ?? 0), 0);
  return (
    <>
      <PageHeader title="Orçamento por categoria" sub={`Quanto querem gastar em cada categoria por mês, e quanto já foi em ${monthLabel(month).toLowerCase()}. Deixe o orçamento vazio para só acompanhar.`} />
      <div className="card px-5 py-4 mb-4 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div><p className="label">Gasto</p><p className="font-display text-[22px] font-bold"><Money value={totalSpent} /></p></div>
        <div><p className="label">Orçamentado</p><p className="font-display text-[22px] font-bold"><Money value={totalBudget} /></p></div>
        {totalBudget > 0 && <Bar className="flex-1 min-w-[160px]" value={totalSpent} max={totalBudget} tone={totalSpent > totalBudget ? "bad" : "brand"} />}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {groups.map(([g, cs]) => {
          const spent = cs.reduce((s, c) => s - (actual.get(c.id) ?? 0), 0);
          return (
            <Card key={g} title={g} extra={<Money value={spent} className="font-semibold" />}>
              <ul className="mt-2">
                {cs.map((c) => {
                  const a = -(actual.get(c.id) ?? 0);
                  const over = c.budget != null && a > c.budget;
                  return (
                    <li key={c.id} className="row-line py-2.5 grid grid-cols-[1fr_auto_110px] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{c.name}</p>
                        {c.budget ? <Bar className="mt-1.5 h-1.5" value={a} max={c.budget} tone={over ? "bad" : a >= c.budget * 0.9 ? "warn" : "good"} /> : null}
                      </div>
                      <span className={cx("text-[13px] font-semibold tnum", over && "text-bad")}>
                        <Money value={a} zeroDash />
                        {c.budget ? <span className="block text-[11px] text-muted font-normal text-right">{fmtPct(a / c.budget)}</span> : null}
                      </span>
                      <NumberInput allowEmpty value={c.budget} onChange={(n) => save("category", { ...c, budget: n })} placeholder="orçamento" className="h-8 text-right text-[13px]" />
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
