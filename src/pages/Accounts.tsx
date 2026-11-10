import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { accountBalance, accountMonthFlow, catById, txInMonth } from "@/lib/calc";
import { fmtDate, monthLabel } from "@/lib/format";
import { BankCard } from "@/components/widgets";
import { Card, Empty, Money, PageHeader, cx } from "@/components/ui";
import type { Transaction } from "@/lib/types";
import { TransactionModal } from "@/components/TransactionModal";

export default function Accounts() {
  const { db, month } = useStore();
  const accounts = db.account.filter((a) => !a.archived);
  const [sel, setSel] = useState(accounts[0]?.id);
  const [edit, setEdit] = useState<Transaction | null>(null);
  const acc = accounts.find((a) => a.id === sel) ?? accounts[0];
  const cats = catById(db);
  const total = accounts.filter((a) => a.kind !== "credit").reduce((s, a) => s + accountBalance(db, a), 0);
  if (!acc)
    return (
      <>
        <PageHeader title="Contas e cartões" />
        <Empty title="Ainda não há contas" action={<Link className="btn-primary" to="/ajustes/bancos">Adicionar contas</Link>} />
      </>
    );
  const flow = accountMonthFlow(db, acc, month);
  const txs = txInMonth(db, month).filter((t) => t.accountId === acc.id).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHeader title="Contas e cartões" sub={<>Saldo total nas contas: <Money value={total} className="font-semibold text-fg" />. O saldo é calculado a partir do saldo inicial e dos movimentos importados.</>} actions={<Link to="/ajustes/bancos" className="btn-ghost">Gerir contas</Link>} />
      <div className="-mx-4 lg:mx-0 flex gap-3 overflow-x-auto px-4 lg:px-0 pb-4 pt-1">
        {accounts.map((a) => <BankCard key={a.id} account={a} selected={a.id === acc.id} onClick={() => setSel(a.id)} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr] items-start">
        <Card title={`${acc.bank} · ${acc.name}`}>
          <dl className="mt-3 grid gap-3 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-muted">Saldo</dt><dd className="font-semibold"><Money value={accountBalance(db, acc)} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Entradas em {monthLabel(month).toLowerCase()}</dt><dd className="font-semibold text-good"><Money value={flow.in} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Saídas</dt><dd className="font-semibold"><Money value={flow.out} /></dd></div>
            {acc.kind === "credit" && (
              <>
                <div className="flex justify-between"><dt className="text-muted">Fecho do extrato</dt><dd>dia {acc.closingDay ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Pagamento</dt><dd>dia {acc.dueDay ?? "—"}</dd></div>
                {acc.creditLimit != null && <div className="flex justify-between"><dt className="text-muted">Limite livre</dt><dd className="font-semibold"><Money value={acc.creditLimit + accountBalance(db, acc)} /></dd></div>}
              </>
            )}
          </dl>
        </Card>
        <Card title="Movimentos do mês">
          {txs.length === 0 ? (
            <p className="text-muted text-[13px] mt-2">Sem movimentos nesta conta em {monthLabel(month).toLowerCase()}.</p>
          ) : (
            <ul className="mt-2">
              {txs.map((t) => (
                <li key={t.id} className="row-line">
                  <button className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-sunk/50 rounded-lg px-1" onClick={() => setEdit(t)}>
                    <span className="text-muted text-[12px] tnum w-11">{fmtDate(t.date)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{t.description}</span>
                      <span className="block text-[11.5px] text-muted">{t.categoryId ? cats.get(t.categoryId)?.name : "Sem categoria"}</span>
                    </span>
                    <Money value={t.amount} signed className={cx("font-semibold", t.amount > 0 && "text-good")} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {edit && <TransactionModal open tx={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
