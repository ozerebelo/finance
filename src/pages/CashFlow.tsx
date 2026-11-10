import { useMemo, useState } from "react";
import { Search, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { catById, monthTotals, txInMonth } from "@/lib/calc";
import type { Transaction } from "@/lib/types";
import { fmtDateLong, monthLabel } from "@/lib/format";
import { Card, Empty, Money, PageHeader, cx } from "@/components/ui";
import { TransactionModal } from "@/components/TransactionModal";
import { ImportModal } from "@/components/ImportModal";

export default function CashFlow() {
  const { db, month } = useStore();
  const [q, setQ] = useState("");
  const [who, setWho] = useState<string>("all");
  const [acc, setAcc] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [edit, setEdit] = useState<Transaction | null>(null);
  const [imp, setImp] = useState(false);
  const cats = catById(db);
  const t = monthTotals(db, month);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return txInMonth(db, month)
      .filter((x) => who === "all" || (who === "joint" ? x.memberId === null : x.memberId === who))
      .filter((x) => acc === "all" || x.accountId === acc)
      .filter((x) => cat === "all" || (cat === "none" ? !x.categoryId : x.categoryId === cat))
      .filter((x) => !needle || x.description.toLowerCase().includes(needle) || x.note.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date) || a.amount - b.amount);
  }, [db, month, q, who, acc, cat]);

  const byDay = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const x of list) {
      if (!m.has(x.date)) m.set(x.date, []);
      m.get(x.date)!.push(x);
    }
    return [...m.entries()];
  }, [list]);

  const uncategorised = txInMonth(db, month).filter((x) => !x.categoryId).length;
  const member = (id: string | null) => (id ? db.member.find((m) => m.id === id)?.name ?? "" : "Casa");
  const account = (id: string | null) => db.account.find((a) => a.id === id);

  return (
    <>
      <PageHeader
        title="Fluxo de caixa"
        sub={`Todos os movimentos de ${monthLabel(month).toLowerCase()}. Toque num movimento para o editar.`}
        actions={<button className="btn-ghost" onClick={() => setImp(true)}><Upload size={15} /> Importar extrato</button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          ["Rendimento", t.income, "text-good"],
          ["Contas", t.bills, ""],
          ["Dia a dia", t.daily, ""],
          ["Sobra", t.left, t.left >= 0 ? "text-good" : "text-bad"],
        ].map(([l, v, c]) => (
          <div key={l as string} className="card px-4 py-3">
            <p className="label">{l}</p>
            <p className={cx("font-display text-[20px] font-bold mt-0.5", c as string)}><Money value={v as number} /></p>
          </div>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <label className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Procurar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar movimentos" />
          </label>
          <select className="input w-auto" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filtrar por pessoa">
            <option value="all">Todos</option>
            <option value="joint">Casa (conjunta)</option>
            {db.member.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="input w-auto" value={acc} onChange={(e) => setAcc(e.target.value)} aria-label="Filtrar por conta">
            <option value="all">Todas as contas</option>
            {db.account.map((a) => <option key={a.id} value={a.id}>{a.bank} · {a.name}</option>)}
          </select>
          <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filtrar por categoria">
            <option value="all">Todas as categorias</option>
            <option value="none">Sem categoria{uncategorised ? ` (${uncategorised})` : ""}</option>
            {[...db.category].sort((a, b) => a.name.localeCompare(b.name, "pt")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {byDay.length === 0 ? (
          <Empty title="Sem movimentos" action={<button className="btn-primary" onClick={() => setImp(true)}><Upload size={15} /> Importar extrato</button>}>
            Importe o extrato do banco em CSV ou use o botão Adicionar no topo.
          </Empty>
        ) : (
          <div className="grid gap-4">
            {byDay.map(([day, txs]) => (
              <div key={day}>
                <p className="label mb-1 capitalize">{fmtDateLong(day)}</p>
                <ul className="rounded-xl border border-line">
                  {txs.map((x) => {
                    const c = x.categoryId ? cats.get(x.categoryId) : null;
                    const a = account(x.accountId);
                    return (
                      <li key={x.id} className="row-line">
                        <button onClick={() => setEdit(x)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-sunk/60">
                          <span className="h-8 w-1.5 rounded-full shrink-0" style={{ background: a?.color ?? "rgb(var(--line))" }} title={a ? `${a.bank} · ${a.name}` : "Sem conta"} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{x.description}</p>
                            <p className="text-[11.5px] text-muted truncate">
                              {c ? c.name : <span className="text-warn font-semibold">Sem categoria</span>} · {member(x.memberId)}
                              {c && (c.kind === "transfer" || c.kind === "saving") && " · movimento interno"}
                            </p>
                          </div>
                          <Money value={x.amount} signed className={cx("font-semibold", x.amount > 0 && "text-good")} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
      {edit && <TransactionModal open tx={edit} onClose={() => setEdit(null)} />}
      {imp && <ImportModal open onClose={() => setImp(false)} />}
    </>
  );
}
