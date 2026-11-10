// Pure money logic. Nothing here touches React or storage, so it is unit-tested.
import type { Account, Bill, BillPayment, Category, DB, ID, ISODate, Member, MonthKey, Settings, Transaction } from "./types";
import { addMonths, daysBetween, dueDate, monthNum, monthOf, round2 } from "./format";

export const DEFAULT_SETTINGS: Settings = {
  householdName: "Casa a Dois",
  housingRefPct: 30,
  reserveTarget: null,
  reminderDays: 3,
  subsidyMonths: [6, 11],
  brandColor: "#243e89",
};

export const settingsOf = (db: DB): Settings => ({ ...DEFAULT_SETTINGS, ...(db.settings[0] ?? {}) });
export const members = (db: DB) => [...db.member].sort((a, b) => a.order - b.order);
export const catById = (db: DB) => new Map(db.category.map((c) => [c.id, c] as const));
// "+ 0" turns -0 into 0, so an empty month never shows "-0%".
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0)) + 0;
const neg = (n: number) => (n === 0 ? 0 : -n);

export const txInMonth = (db: DB, m: MonthKey) => db.transaction.filter((t) => monthOf(t.date) === m);

/** Categories that belong to a recurring bill: their spending is counted through the bill, not day to day. */
export function billCategoryIds(db: DB): Set<ID> {
  return new Set(db.bill.filter((b) => b.active && b.categoryId).map((b) => b.categoryId as ID));
}

function kindOf(cats: Map<ID, Category>, t: Transaction): Category["kind"] | null {
  if (!t.categoryId) return t.amount < 0 ? "expense" : null; // uncategorised spending still counts
  return cats.get(t.categoryId)?.kind ?? null;
}

// ---------- income ----------
export interface IncomeBreakdown {
  salary: number;
  subsidy: number;
  extras: number;
  total: number;
  /** True when the figures come from real transactions rather than the plan. */
  salaryIsActual: boolean;
  extrasIsActual: boolean;
}

export function expectedIncome(db: DB, member: Member, m: MonthKey) {
  const s = settingsOf(db);
  const subsidy = member.subsidies && s.subsidyMonths.includes(monthNum(m)) ? member.salary : 0;
  const extras = sum(
    db.incomeSource
      .filter((src) => src.active && src.memberId === member.id && src.amount)
      .map((src) => (src.frequency === "monthly" ? src.amount! : src.frequency === "yearly" && src.month === monthNum(m) ? src.amount! : 0)),
  );
  return { salary: member.salary, subsidy, extras };
}

/** Per bucket: the real amount once it has arrived, otherwise what is expected. */
export function incomeFor(db: DB, member: Member, m: MonthKey): IncomeBreakdown {
  const cats = catById(db);
  const exp = expectedIncome(db, member, m);
  let salaryActual = 0;
  let extrasActual = 0;
  for (const t of txInMonth(db, m)) {
    if (t.memberId !== member.id || t.amount <= 0) continue;
    const c = t.categoryId ? cats.get(t.categoryId) : undefined;
    if (!c || c.kind !== "income") continue;
    if (c.group === "Salário") salaryActual += t.amount;
    else extrasActual += t.amount;
  }
  const salaryIsActual = salaryActual > 0;
  const extrasIsActual = extrasActual > 0;
  const salary = salaryIsActual ? round2(salaryActual) : exp.salary + exp.subsidy;
  const extras = extrasIsActual ? round2(extrasActual) : exp.extras;
  return {
    salary: salaryIsActual ? salary : exp.salary,
    subsidy: salaryIsActual ? 0 : exp.subsidy,
    extras,
    total: round2(salary + extras),
    salaryIsActual,
    extrasIsActual,
  };
}

// ---------- bills ----------
export interface BillLine {
  bill: Bill;
  due: ISODate;
  payment: BillPayment | null;
  paid: boolean;
  /** Real amount when paid, otherwise the estimate. */
  amount: number;
}

export function billsForMonth(db: DB, m: MonthKey): BillLine[] {
  return db.bill
    .filter((b) => b.active)
    .map((bill) => {
      const payment = db.billPayment.find((p) => p.billId === bill.id && p.month === m) ?? null;
      return { bill, due: dueDate(m, bill.dueDay), payment, paid: !!payment, amount: payment ? payment.amount : bill.amount };
    })
    .sort((a, b) => a.bill.dueDay - b.bill.dueDay || b.amount - a.amount);
}

/** What the transactions in a bill's category add up to this month, to prefill "mark as paid". */
export function suggestedBillAmount(db: DB, bill: Bill, m: MonthKey): number {
  if (!bill.categoryId) return bill.amount;
  const spent = -sum(txInMonth(db, m).filter((t) => t.categoryId === bill.categoryId).map((t) => t.amount));
  return spent > 0 ? spent : bill.amount;
}

// ---------- spending ----------
/** Day-to-day spending: expenses outside bill categories. who: a member id, null (joint) or "all". */
export function dayToDay(db: DB, m: MonthKey, who: ID | null | "all"): number {
  const cats = catById(db);
  const billCats = billCategoryIds(db);
  return neg(sum(
    txInMonth(db, m)
      .filter((t) => kindOf(cats, t) === "expense" && !(t.categoryId && billCats.has(t.categoryId)))
      .filter((t) => who === "all" || t.memberId === who)
      .map((t) => t.amount),
  ));
}

export const annualMonthly = (db: DB, who: ID | null | "all") =>
  sum(db.annualBill.filter((a) => who === "all" || a.payerId === who).map((a) => (a.amount ?? 0) / 12));

// ---------- forecast ("Saldo previsto") ----------
export interface Segment {
  key: string;
  label: string;
  amount: number;
  tone: "p1" | "brand" | "muted" | "good" | "warn" | "bad";
}
export interface Forecast {
  income: number;
  incomeNote: string;
  segments: Segment[];
  left: number;
  leftPct: number;
}

export function personalForecast(db: DB, member: Member, m: MonthKey): Forecast {
  const inc = incomeFor(db, member, m);
  const bills = billsForMonth(db, m);
  const personalBills = sum(bills.filter((l) => l.bill.payerId === member.id).map((l) => l.amount));
  const daily = dayToDay(db, m, member.id);
  const annual = annualMonthly(db, member.id);
  const segments: Segment[] = [
    { key: "joint", label: "Para a conta conjunta", amount: member.jointContribution, tone: "p1" },
    { key: "bills", label: "Contas pessoais", amount: personalBills, tone: "brand" },
    { key: "daily", label: "Dia a dia", amount: daily, tone: "muted" },
  ];
  if (annual > 0) segments.push({ key: "annual", label: "Contas anuais", amount: annual, tone: "warn" });
  const left = round2(inc.total - segments.reduce((a, s) => a + s.amount, 0));
  return {
    income: inc.total,
    incomeNote: inc.subsidy > 0 ? "com subsídio" : inc.salaryIsActual ? "recebido" : "previsto",
    segments,
    left,
    leftPct: inc.total > 0 ? left / inc.total : 0,
  };
}

export function coupleForecast(db: DB, m: MonthKey): Forecast {
  const ms = members(db);
  const incs = ms.map((mm) => incomeFor(db, mm, m));
  const income = sum(incs.map((i) => i.total));
  const bills = billsForMonth(db, m);
  const jointBills = sum(bills.filter((l) => l.bill.payerId === null).map((l) => l.amount));
  const personalBills = sum(bills.filter((l) => l.bill.payerId !== null).map((l) => l.amount));
  const daily = dayToDay(db, m, "all");
  const annual = annualMonthly(db, "all");
  const segments: Segment[] = [
    { key: "joint", label: "Contas da casa", amount: jointBills, tone: "p1" },
    { key: "bills", label: "Contas pessoais", amount: personalBills, tone: "brand" },
    { key: "daily", label: "Dia a dia", amount: daily, tone: "muted" },
  ];
  if (annual > 0) segments.push({ key: "annual", label: "Contas anuais", amount: annual, tone: "warn" });
  const left = round2(income - segments.reduce((a, s) => a + s.amount, 0));
  return {
    income,
    incomeNote: incs.some((i) => i.subsidy > 0) ? "com subsídio" : "do casal",
    segments,
    left,
    leftPct: income > 0 ? left / income : 0,
  };
}

// ---------- joint account and the split ----------
export interface JointView {
  contributions: { member: Member; amount: number; share: number; fairShare: number }[];
  totalIn: number;
  bills: number;
  daily: number;
  annual: number;
  left: number;
}

export function jointView(db: DB, m: MonthKey): JointView {
  const ms = members(db);
  const totalIn = sum(ms.map((x) => x.jointContribution));
  const totalSalary = sum(ms.map((x) => x.salary));
  const bills = sum(billsForMonth(db, m).filter((l) => l.bill.payerId === null).map((l) => l.amount));
  const daily = dayToDay(db, m, null);
  const annual = annualMonthly(db, null);
  return {
    contributions: ms.map((x) => ({
      member: x,
      amount: x.jointContribution,
      share: totalIn > 0 ? x.jointContribution / totalIn : 0,
      fairShare: totalSalary > 0 ? x.salary / totalSalary : 0,
    })),
    totalIn,
    bills,
    daily,
    annual,
    left: round2(totalIn - bills - daily - annual),
  };
}

// ---------- housing ----------
export function housing(db: DB, m: MonthKey, who: Member | "couple") {
  const lines = billsForMonth(db, m).filter((l) => l.bill.housing);
  const ms = members(db);
  const totalIn = sum(ms.map((x) => x.jointContribution));
  const items = lines.map((l) => {
    let mine = l.amount;
    if (who !== "couple") {
      if (l.bill.payerId === null) mine = totalIn > 0 ? (l.amount * who.jointContribution) / totalIn : l.amount / Math.max(ms.length, 1);
      else if (l.bill.payerId !== who.id) mine = 0;
    }
    return { line: l, amount: round2(mine) };
  });
  const total = sum(items.map((i) => i.amount));
  const salary = who === "couple" ? sum(ms.map((x) => x.salary)) : who.salary;
  return { items, total, salary, pct: salary > 0 ? total / salary : 0, ref: settingsOf(db).housingRefPct / 100 };
}

// ---------- categories, accounts ----------
export function categoryActuals(db: DB, m: MonthKey): Map<ID, number> {
  const out = new Map<ID, number>();
  for (const t of txInMonth(db, m)) {
    if (!t.categoryId) continue;
    out.set(t.categoryId, round2((out.get(t.categoryId) ?? 0) + t.amount));
  }
  // A bill paid by ticking it off, with no imported transaction, still counts in its category.
  for (const l of billsForMonth(db, m)) {
    const c = l.bill.categoryId;
    if (c && l.paid && !out.get(c)) out.set(c, -l.amount);
  }
  return out;
}

export function accountBalance(db: DB, a: Account, upTo?: ISODate): number {
  return round2(
    a.openingBalance +
      db.transaction
        .filter((t) => t.accountId === a.id && t.date >= a.openingDate && (!upTo || t.date <= upTo))
        .reduce((s, t) => s + t.amount, 0),
  );
}

export function accountMonthFlow(db: DB, a: Account, m: MonthKey) {
  const txs = txInMonth(db, m).filter((t) => t.accountId === a.id);
  return { in: sum(txs.filter((t) => t.amount > 0).map((t) => t.amount)), out: -sum(txs.filter((t) => t.amount < 0).map((t) => t.amount)), count: txs.length };
}

// ---------- month totals (review, yearly report) ----------
export interface MonthTotals {
  month: MonthKey;
  income: number;
  bills: number;
  daily: number;
  expenses: number;
  saved: number;
  left: number;
  savingsRate: number;
  hasData: boolean;
}

export function monthTotals(db: DB, m: MonthKey): MonthTotals {
  const cats = catById(db);
  const income = sum(members(db).map((x) => incomeFor(db, x, m).total));
  const bills = sum(billsForMonth(db, m).map((l) => l.amount));
  const daily = dayToDay(db, m, "all");
  const txs = txInMonth(db, m);
  const saved = -sum(txs.filter((t) => kindOf(cats, t) === "saving").map((t) => t.amount));
  const expenses = round2(bills + daily);
  const left = round2(income - expenses);
  return {
    month: m,
    income,
    bills,
    daily,
    expenses,
    saved: Math.max(saved, 0),
    left,
    savingsRate: income > 0 ? left / income : 0,
    hasData: txs.length > 0 || db.billPayment.some((p) => p.month === m),
  };
}

export function topExpenses(db: DB, m: MonthKey, n = 5) {
  const cats = catById(db);
  return txInMonth(db, m)
    .filter((t) => kindOf(cats, t) === "expense" && t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, n);
}

export function spendingByMember(db: DB, m: MonthKey) {
  const cats = catById(db);
  const txs = txInMonth(db, m).filter((t) => kindOf(cats, t) === "expense");
  const rows = members(db).map((x) => ({ id: x.id as ID | null, name: x.name, amount: -sum(txs.filter((t) => t.memberId === x.id).map((t) => t.amount)) }));
  rows.push({ id: null, name: "Conjunta", amount: -sum(txs.filter((t) => t.memberId === null).map((t) => t.amount)) });
  return rows;
}

export function highlights(db: DB, m: MonthKey): string[] {
  const cur = monthTotals(db, m);
  const prev = monthTotals(db, addMonths(m, -1));
  const out: string[] = [];
  if (!cur.hasData) out.push("Ainda não há movimentos neste mês. Importe um extrato ou adicione despesas.");
  if (cur.left >= 0) out.push(`Sobram ${Math.round(cur.left)} € (${Math.round(cur.savingsRate * 100)}% do rendimento).`);
  else out.push(`O mês fecha ${Math.round(-cur.left)} € abaixo do rendimento.`);
  if (prev.hasData) {
    const d = cur.daily - prev.daily;
    if (Math.abs(d) >= 20) out.push(`Dia a dia ${d > 0 ? "subiu" : "desceu"} ${Math.round(Math.abs(d))} € face ao mês anterior.`);
  }
  const cats = catById(db);
  const actual = categoryActuals(db, m);
  const over = db.category.filter((c) => c.kind === "expense" && c.budget && -(actual.get(c.id) ?? 0) > c.budget);
  if (over.length) out.push(`Acima do orçamento: ${over.map((c) => c.name).join(", ")}.`);
  const pending = billsForMonth(db, m).filter((l) => !l.paid);
  if (pending.length) out.push(`${pending.length} conta(s) por marcar como paga(s).`);
  void cats;
  return out;
}

// ---------- reminders ----------
export interface Alert {
  id: string;
  level: "info" | "warn" | "bad";
  text: string;
  href: string;
}

export function alerts(db: DB, today: ISODate): Alert[] {
  const s = settingsOf(db);
  const m = monthOf(today);
  const out: Alert[] = [];
  for (const l of billsForMonth(db, m)) {
    if (l.paid) continue;
    const d = daysBetween(today, l.due);
    if (d < 0) out.push({ id: "late-" + l.bill.id, level: "bad", text: `${l.bill.name} venceu a ${l.due.slice(8)}`, href: "/casa" });
    else if (d <= s.reminderDays) out.push({ id: "due-" + l.bill.id, level: "warn", text: d === 0 ? `${l.bill.name} vence hoje` : `${l.bill.name} vence em ${d} dia${d > 1 ? "s" : ""}`, href: "/casa" });
  }
  for (const a of db.account) {
    if (a.kind !== "credit" || !a.closingDay || a.archived) continue;
    const d = daysBetween(today, dueDate(m, a.closingDay));
    if (d >= 0 && d <= s.reminderDays) out.push({ id: "close-" + a.id, level: "info", text: `Extrato do ${a.name} fecha em ${d} dia(s)`, href: "/cartoes" });
  }
  const next = monthNum(addMonths(m, 1));
  for (const a of db.annualBill) {
    if (!a.dueMonth || (a.dueMonth !== monthNum(m) && a.dueMonth !== next)) continue;
    const missing = (a.amount ?? 0) - a.setAside;
    out.push({
      id: "annual-" + a.id,
      level: missing > 0 ? "warn" : "info",
      text: a.amount == null ? `${a.name}: falta indicar o valor` : missing > 0 ? `${a.name}: faltam ${Math.round(missing)} € no fundo` : `${a.name} está coberta`,
      href: "/reserva",
    });
  }
  const actual = categoryActuals(db, m);
  for (const c of db.category) {
    if (c.kind === "expense" && c.budget && -(actual.get(c.id) ?? 0) > c.budget) out.push({ id: "over-" + c.id, level: "warn", text: `${c.name} passou o orçamento`, href: "/categorias" });
  }
  return out;
}

export function reserveTarget(db: DB): number | null {
  return settingsOf(db).reserveTarget;
}
