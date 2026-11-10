import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Droplet, Home, Pencil, Wifi, Zap, Flame, Receipt, ChevronRight, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  accountBalance, accountMonthFlow, annualMonthly, billsForMonth, coupleForecast, housing, jointView, members, personalForecast, settingsOf, suggestedBillAmount, type BillLine,
} from "@/lib/calc";
import type { Account, Member } from "@/lib/types";
import { daysBetween, fmtPct, todayISO, uid, monthOf, fmtDate } from "@/lib/format";
import { Avatar, Bar, BigMoney, Card, Empty, Field, Modal, Money, NumberInput, Segmented, cx } from "./ui";
import { CalendarArt, CardArt, HouseArt, PiggyArt, ScaleArt, WalletArt } from "./art";

const toneBg: Record<string, string> = { p1: "bg-p1", p2: "bg-p2", brand: "bg-brand", muted: "bg-muted/40", good: "bg-good", warn: "bg-warn", bad: "bg-bad" };

// ---------- Saldo previsto ----------
export function SaldoCard({ className }: { className?: string }) {
  const { db, month, me } = useStore();
  const [view, setView] = useState<"me" | "couple">("me");
  const f = view === "me" && me ? personalForecast(db, me, month) : coupleForecast(db, month);
  const total = Math.max(f.income, f.segments.reduce((a, s) => a + s.amount, 0) + Math.max(f.left, 0), 1);
  return (
    <Card className={className} title="Saldo previsto" art={<WalletArt size={104} />}>
      <Segmented className="mt-2" value={view} onChange={setView} options={[["me", me?.name ?? "Eu"], ["couple", "Casal"]]} />
      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
        <BigMoney value={f.left} size="xl" className={f.left < 0 ? "text-bad" : ""} />
        <div className="pb-1.5 border-l border-line pl-4">
          <p className={cx("font-semibold text-[13.5px] flex items-center gap-1", f.left >= 0 ? "text-good" : "text-bad")}>
            <TrendingUp size={15} /> {fmtPct(Math.max(f.leftPct, 0))} {view === "me" ? "do salário livre" : "do rendimento livre"}
          </p>
          <p className="text-muted text-[12.5px]">valor estimado depois de pagar todas as contas</p>
        </div>
      </div>
      <div className="mt-6 flex h-3 w-full gap-1 overflow-hidden rounded-full" aria-hidden>
        {f.segments.map((s) => s.amount > 0 && <div key={s.key} className={cx("h-full first:rounded-l-full", toneBg[s.tone])} style={{ width: (s.amount / total) * 100 + "%" }} />)}
        {f.left > 0 && <div className="h-full rounded-r-full bg-good" style={{ width: (f.left / total) * 100 + "%" }} />}
      </div>
      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-3">
        <div>
          <dt className="label flex items-center gap-1">
            {view === "me" ? "Salário" : "Rendimento"} <span className="text-[11px]">({f.incomeNote})</span>
          </dt>
          <dd className="font-semibold text-[14.5px] flex items-center gap-1.5">
            <Money value={f.income} />
            <Link to="/ajustes/renda" className="text-muted hover:text-fg" aria-label="Editar rendimento">
              <Pencil size={13} />
            </Link>
          </dd>
        </div>
        {f.segments.map((s) => (
          <div key={s.key}>
            <dt className="label flex items-center gap-1.5">
              <span className={cx("h-2 w-2 rounded-full", toneBg[s.tone])} />
              {s.label}
            </dt>
            <dd className="font-semibold text-[14.5px]">
              − <Money value={s.amount} /> <span className="text-muted text-[11.5px] font-normal">· {fmtPct(f.income ? s.amount / f.income : 0)}</span>
            </dd>
          </div>
        ))}
        <div>
          <dt className="label flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-good" /> = Sobra
          </dt>
          <dd className={cx("font-semibold text-[14.5px]", f.left >= 0 ? "text-good" : "text-bad")}>
            <Money value={f.left} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

// ---------- Contas a pagar ----------
export function PayBillModal({ line, onClose }: { line: BillLine; onClose: () => void }) {
  const { db, month, save } = useStore();
  const [amount, setAmount] = useState<number | null>(suggestedBillAmount(db, line.bill, month));
  const [date, setDate] = useState(monthOf(todayISO()) === month ? todayISO() : line.due);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Pagar ${line.bill.name}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={amount == null}
            onClick={async () => {
              await save("billPayment", { id: uid(), billId: line.bill.id, month, amount: amount ?? line.bill.amount, paidOn: date });
              onClose();
            }}
          >
            Marcar como paga
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor real (€)" hint={`Estimativa: ${line.bill.amount.toFixed(2).replace(".", ",")} €`}>{(id) => <NumberInput id={id} value={amount} onChange={setAmount} />}</Field>
        <Field label="Pago em">{(id) => <input id={id} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}

export function useBillToggle() {
  const { remove } = useStore();
  const [paying, setPaying] = useState<BillLine | null>(null);
  const toggle = (l: BillLine) => (l.paid && l.payment ? remove("billPayment", l.payment.id) : setPaying(l));
  const modal = paying ? <PayBillModal line={paying} onClose={() => setPaying(null)} /> : null;
  return { toggle, modal };
}

export function BillRow({ line, onToggle, showDue }: { line: BillLine; onToggle: () => void; showDue?: boolean }) {
  const { db } = useStore();
  const payer = line.bill.payerId ? db.member.find((m) => m.id === line.bill.payerId) : null;
  return (
    <li className="row-line flex items-center gap-3 py-3">
      <button
        onClick={onToggle}
        aria-label={line.paid ? `Desmarcar ${line.bill.name}` : `Marcar ${line.bill.name} como paga`}
        className={cx("grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors", line.paid ? "border-good bg-good text-white" : "border-line hover:border-brand")}
      >
        {line.paid && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("font-medium truncate", line.paid && "text-muted line-through decoration-muted/50")}>{line.bill.name}</p>
        <p className="text-[11.5px] text-muted">
          {showDue && <>dia {line.bill.dueDay} · </>}
          {payer ? payer.name : "Conta conjunta"}
          {line.bill.variable && !line.paid && " · estimativa"}
        </p>
      </div>
      <Money value={line.amount} className={cx("font-semibold", line.paid && "text-muted")} />
    </li>
  );
}

export function BillsCard({ className }: { className?: string }) {
  const { db, month } = useStore();
  const lines = billsForMonth(db, month);
  const days = [...new Set(lines.map((l) => l.bill.dueDay))].sort((a, b) => a - b);
  const [day, setDay] = useState<number | null>(null);
  const { toggle, modal } = useBillToggle();
  const pending = lines.filter((l) => !l.paid);
  const pendingTotal = pending.reduce((s, l) => s + l.amount, 0);
  const next = pending[0];
  const today = todayISO();
  const shown = day == null ? lines : lines.filter((l) => l.bill.dueDay === day);
  return (
    <Card className={className} title={<>Contas a pagar {next && <span className="text-muted font-normal text-[12.5px]">· próxima dia {next.bill.dueDay}</span>}</>} art={<CalendarArt size={80} />}>
      <div className="mt-2">
        <BigMoney value={pendingTotal} size="lg" />
        <p className="text-muted text-[12.5px] mt-1.5">
          {next ? (monthOf(today) === month ? (daysBetween(today, next.due) >= 0 ? `próxima em ${daysBetween(today, next.due)} dias` : "há contas em atraso") : `próxima a ${fmtDate(next.due)}`) : "tudo pago"} · <b className="text-fg">{lines.length - pending.length} de {lines.length} pagas</b>
        </p>
      </div>
      {lines.length === 0 ? (
        <div className="mt-5">
          <Empty title="Sem contas mensais" action={<Link to="/ajustes/contas-casa" className="btn-primary">Adicionar contas</Link>} />
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const n = lines.filter((l) => l.bill.dueDay === d);
              const allPaid = n.every((l) => l.paid);
              return (
                <button key={d} onClick={() => setDay(day === d ? null : d)} className={cx("flex min-w-[58px] flex-col items-center rounded-xl border px-3 py-2 transition-colors", day === d ? "border-brand bg-brand text-on-brand" : "border-line hover:border-brand/50")}>
                  <span className="font-display text-[16px] font-bold tnum">{String(d).padStart(2, "0")}</span>
                  <span className="flex gap-0.5 mt-1">
                    {n.slice(0, 5).map((l) => (
                      <span key={l.bill.id} className={cx("h-1 w-1 rounded-full", day === d ? "bg-on-brand" : allPaid ? "bg-good" : l.paid ? "bg-good" : "bg-muted/50")} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <ul className="mt-2">
            {shown.map((l) => (
              <BillRow key={l.bill.id} line={l} onToggle={() => toggle(l)} showDue={day == null} />
            ))}
          </ul>
        </>
      )}
      {modal}
    </Card>
  );
}

// ---------- Divisão da casa ----------
export function SplitCard({ className, compact }: { className?: string; compact?: boolean }) {
  const { db, month } = useStore();
  const j = jointView(db, month);
  const lines = billsForMonth(db, month).filter((l) => l.bill.payerId === null);
  const [a, b] = j.contributions;
  const toneDot = (m: Member) => (m.color === "p1" ? "bg-p1" : "bg-p2");
  return (
    <Card className={className} title="Divisão da casa" art={<ScaleArt size={84} />}>
      <p className="label mt-3">Entra na conta conjunta por mês</p>
      <BigMoney value={j.totalIn} size="lg" className="mt-1 block" />
      {a && b && (
        <>
          <div className="mt-5 flex items-end justify-between text-[12.5px]">
            <div>
              <p className="label flex items-center gap-1.5"><span className={cx("h-2 w-2 rounded-full", toneDot(a.member))} />{a.member.name} põe</p>
              <p className="font-semibold text-[15px]"><Money value={a.amount} /></p>
            </div>
            <div className="text-right">
              <p className="label flex items-center gap-1.5 justify-end">{b.member.name} põe <span className={cx("h-2 w-2 rounded-full", toneDot(b.member))} /></p>
              <p className="font-semibold text-[15px]"><Money value={b.amount} /></p>
            </div>
          </div>
          <div className="relative mt-2 flex h-7 overflow-hidden rounded-lg text-[11.5px] font-bold text-white">
            <div className={cx("flex items-center pl-2.5", a.member.color === "p1" ? "bg-p1" : "bg-p2")} style={{ width: a.share * 100 + "%" }}>{fmtPct(a.share, 1)}</div>
            <div className={cx("flex items-center justify-end pr-2.5 flex-1", b.member.color === "p1" ? "bg-p1" : "bg-p2")}>{fmtPct(b.share, 1)}</div>
            <div className="absolute -top-0.5 -bottom-0.5 w-[3px] bg-fg rounded" style={{ left: `calc(${a.fairShare * 100}% - 1.5px)` }} title="Divisão proporcional ao salário" />
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            A linha marca a divisão proporcional aos salários: {fmtPct(a.fairShare, 0)} / {fmtPct(b.fairShare, 0)}.
          </p>
        </>
      )}
      {!compact && (
        <>
          <p className="mt-5 text-[13px] font-semibold">Sai da conjunta este mês</p>
          <ul className="mt-1">
            {lines.map((l) => (
              <li key={l.bill.id} className="row-line flex items-center gap-2.5 py-2.5 text-[13.5px]">
                <span className={cx("h-2 w-2 rounded-full", l.paid ? "bg-good" : "bg-brand")} />
                <span className="flex-1 truncate">{l.bill.name}</span>
                <Money value={l.amount} className="font-semibold" />
              </li>
            ))}
            <li className="row-line flex items-center gap-2.5 py-2.5 text-[13.5px]">
              <span className="h-2 w-2 rounded-full bg-muted/40" />
              <span className="flex-1">Dia a dia (conjunta)</span>
              <Money value={j.daily} className="font-semibold" />
            </li>
            {j.annual > 0 && (
              <li className="row-line flex items-center gap-2.5 py-2.5 text-[13.5px]">
                <span className="h-2 w-2 rounded-full bg-warn" />
                <span className="flex-1">Reserva para contas anuais</span>
                <Money value={j.annual} className="font-semibold" />
              </li>
            )}
          </ul>
        </>
      )}
      <div className="mt-4 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 border-t border-line px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 rounded-b-card">
        <span className="text-[13px]">{j.left >= 0 ? "Fica na conjunta" : "Falta na conjunta"}</span>
        <Money value={j.left} className={cx("font-bold", j.left >= 0 ? "text-good" : "text-bad")} />
      </div>
    </Card>
  );
}

// ---------- Contas e cartões ----------
const KIND_LABEL: Record<Account["kind"], string> = { current: "À ordem", savings: "Poupança", credit: "Crédito", meal: "Refeição", investment: "Investimento" };

export function BankCard({ account, selected, onClick }: { account: Account; selected?: boolean; onClick?: () => void }) {
  const { db, hidden } = useStore();
  const owner = account.ownerId ? db.member.find((m) => m.id === account.ownerId)?.name : "Conjunta";
  const bal = accountBalance(db, account);
  return (
    <button
      onClick={onClick}
      className={cx("relative flex h-[150px] w-[240px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl p-4 text-left text-white shadow-md transition-transform", selected ? "ring-2 ring-offset-2 ring-brand ring-offset-surface" : "hover:-translate-y-0.5")}
      style={{ background: `linear-gradient(135deg, ${account.color} 0%, color-mix(in srgb, ${account.color} 60%, #000) 100%)` }}
    >
      <span className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
      <span className="absolute -right-16 top-10 h-36 w-36 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between">
        <span className="font-display text-[15px] font-bold tracking-tight">{account.bank}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-semibold">{KIND_LABEL[account.kind]}</span>
      </div>
      <div className="relative">
        <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden>
          <rect width="30" height="22" rx="4" fill="#f1d38a" />
          <path d="M0 8h30M0 14h30M10 0v22M20 0v22" stroke="#c9a24a" strokeWidth="1" />
        </svg>
      </div>
      <div className="relative flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider opacity-70">{owner}</p>
          <p className="text-[12.5px] font-semibold truncate">{account.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider opacity-70">{account.kind === "credit" ? "Em dívida" : "Saldo"}</p>
          <p className="text-[13px] font-bold tnum">{hidden ? "•••" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(account.kind === "credit" ? -bal : bal)}</p>
        </div>
      </div>
    </button>
  );
}

export function AccountsCard({ className }: { className?: string }) {
  const { db, month } = useStore();
  const accounts = db.account.filter((a) => !a.archived);
  const [sel, setSel] = useState<string | null>(accounts[0]?.id ?? null);
  const acc = accounts.find((a) => a.id === sel) ?? accounts[0];
  const flow = acc ? accountMonthFlow(db, acc, month) : null;
  return (
    <Card className={className} title="Contas e cartões" art={<CardArt size={80} />}>
      {accounts.length === 0 ? (
        <div className="mt-6">
          <Empty title="Sem contas" action={<Link to="/ajustes/bancos" className="btn-primary">Adicionar contas</Link>}>Adicione as vossas contas para importar extratos e ver saldos.</Empty>
        </div>
      ) : (
        <>
          <p className="label mt-3">Saídas este mês · {acc?.bank}</p>
          <BigMoney value={flow?.out ?? 0} size="lg" className="mt-1 block" />
          <p className="text-[12.5px] text-muted mt-1.5">
            Entradas <Money value={flow?.in ?? 0} className="text-good font-semibold" /> · {flow?.count ?? 0} movimentos
          </p>
          <div className="mt-4 -mx-5 sm:-mx-6 flex gap-3 overflow-x-auto px-5 sm:px-6 pb-3 pt-1">
            {accounts.map((a) => (
              <BankCard key={a.id} account={a} selected={a.id === acc?.id} onClick={() => setSel(a.id)} />
            ))}
          </div>
          <Link to="/cartoes" className="btn-ghost mt-1">
            Ver movimentos <ChevronRight size={15} />
          </Link>
        </>
      )}
    </Card>
  );
}

// ---------- Moradia ----------
const HOUSE_ICON = (name: string) => {
  const n = name.toLowerCase();
  if (/renda|hipoteca|casa|condom/.test(n)) return Home;
  if (/agua|água/.test(n)) return Droplet;
  if (/luz|eletric|edp/.test(n)) return Zap;
  if (/gás|gas/.test(n)) return Flame;
  if (/net|vodafone|meo|nos|wifi|internet/.test(n)) return Wifi;
  return Receipt;
};

export function HousingCard({ className }: { className?: string }) {
  const { db, month, me } = useStore();
  const [view, setView] = useState<"me" | "couple">("me");
  const h = housing(db, month, view === "me" && me ? me : "couple");
  const max = Math.max(0.6, h.pct * 1.15);
  const ok = h.pct <= h.ref;
  return (
    <Card className={className} title="Moradia" art={<HouseArt size={86} />}>
      <p className="label mt-3">{view === "me" ? "Quanto gastas para morar" : "Quanto gastam para morar"}</p>
      <BigMoney value={h.total} size="lg" className="mt-1 block" />
      <p className={cx("mt-1.5 text-[12.5px] font-semibold", ok ? "text-good" : "text-warn")}>
        {ok ? "✓" : "!"} {fmtPct(h.pct)} do salário <span className="text-muted font-normal">· referência: até {fmtPct(h.ref)}</span>
      </p>
      <Segmented className="mt-4 w-full" value={view} onChange={setView} options={[["me", "Só o meu salário"], ["couple", "Salário do casal"]]} />
      <div className="mt-5">
        <Bar value={h.pct} max={max} tone={ok ? "good" : "warn"} marker={h.ref} />
        <div className="mt-1.5 flex justify-between text-[11px] text-muted tnum">
          <span>0%</span>
          <span>{fmtPct(max)} do salário</span>
        </div>
      </div>
      <p className="mt-5 text-[13px] font-semibold">O que entra na conta</p>
      {h.items.length === 0 ? (
        <p className="text-muted text-[12.5px] mt-1">Marque contas como "habitação" em Ajustes → Contas da casa.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {h.items.map(({ line, amount }) => {
            const I = HOUSE_ICON(line.bill.name);
            return (
              <div key={line.bill.id} className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <I size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] text-muted truncate">{line.bill.name}</p>
                  <p className="text-[13px] font-semibold">
                    {line.bill.payerId === null && view === "me" && <span className="text-muted">≈ </span>}
                    <Money value={amount} />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---------- Reserve strip ----------
export function ReserveStrip({ className }: { className?: string }) {
  const { db } = useStore();
  const s = settingsOf(db);
  const reserve = db.goal.find((g) => g.kind === "reserve");
  const invested = db.investment.reduce((a, i) => a + i.currentValue, 0);
  const annual = annualMonthly(db, "all");
  const annualMissing = db.annualBill.filter((a) => a.amount == null).length;
  const target = s.reserveTarget;
  return (
    <section className={cx("card card-pad relative", className)}>
      <div className="flex flex-wrap items-start gap-x-10 gap-y-5 pr-0 sm:pr-24">
        <div>
          <h2 className="card-title">Nossa reserva</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <BigMoney value={reserve?.saved ?? 0} size="md" />
            {target ? <span className="text-muted text-[12.5px]">de <Money value={target} /></span> : <Link to="/ajustes/preferencias" className="chip bg-warn/15 text-warn">definir objetivo</Link>}
          </div>
          {target ? <Bar className="mt-2 w-56" value={reserve?.saved ?? 0} max={target} tone="good" /> : null}
        </div>
        <div>
          <p className="label">Investimentos (PPR, ETF, Certificados)</p>
          <p className="mt-1 font-display text-[22px] font-bold"><Money value={invested} /></p>
        </div>
        <div>
          <p className="label">Contas anuais · pôr de lado por mês</p>
          <p className="mt-1 font-display text-[22px] font-bold"><Money value={annual} /></p>
          {annualMissing > 0 && <Link to="/ajustes/anuais" className="chip bg-warn/15 text-warn mt-1">{annualMissing} sem valor</Link>}
        </div>
        <Link to="/reserva" className="btn-ghost self-center">Ver reserva <ChevronRight size={15} /></Link>
      </div>
      <div className="pointer-events-none absolute right-5 top-4 hidden sm:block">
        <PiggyArt size={88} />
      </div>
    </section>
  );
}

export function useMembers() {
  const { db } = useStore();
  return useMemo(() => members(db), [db]);
}

export { Avatar };
