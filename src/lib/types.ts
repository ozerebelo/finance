// Domain model. Every record belongs to one household and is stored generically
// (kind + JSON body), so adding a field never needs a database migration.

export type ID = string;
/** Month key, e.g. "2026-11". */
export type MonthKey = string;
/** ISO date, e.g. "2026-11-10". */
export type ISODate = string;

export interface Settings {
  householdName: string;
  /** Housing cost reference line, as % of salary. */
  housingRefPct: number;
  /** Fixed emergency-fund target in euros (null = not decided yet). */
  reserveTarget: number | null;
  /** Show bill reminders this many days before the due day. */
  reminderDays: number;
  /** Months (1-12) when holiday and Christmas pay arrive. */
  subsidyMonths: number[];
  brandColor: string;
}

export interface Member {
  id: ID;
  name: string;
  /** Login e-mail, used to link a Supabase user to this person. */
  email: string | null;
  /** "p1" | "p2": which person colour to use in charts. */
  color: "p1" | "p2";
  /** Net monthly salary. */
  salary: number;
  payDay: number | null;
  /** How much this person moves into the joint account each month. */
  jointContribution: number;
  /** Holiday and Christmas pay paid as two extra salaries (14 payments). */
  subsidies: boolean;
  order: number;
}

export type AccountKind = "current" | "savings" | "credit" | "meal" | "investment";

export interface Account {
  id: ID;
  /** null = joint account. */
  ownerId: ID | null;
  bank: string;
  name: string;
  kind: AccountKind;
  /** Card colour (hex). */
  color: string;
  openingBalance: number;
  openingDate: ISODate;
  /** Credit cards only. */
  closingDay: number | null;
  dueDay: number | null;
  creditLimit: number | null;
  archived: boolean;
}

/** income/expense count in the month; transfer and saving move money between your own accounts. */
export type CategoryKind = "income" | "expense" | "transfer" | "saving";

export interface Category {
  id: ID;
  name: string;
  group: string;
  kind: CategoryKind;
  /** Monthly budget (expenses) or expected amount (income). */
  budget: number | null;
}

export interface Bill {
  id: ID;
  name: string;
  /** Estimated monthly amount. */
  amount: number;
  dueDay: number;
  /** null = paid from the joint account. */
  payerId: ID | null;
  shared: boolean;
  /** Amount changes every month (water, electricity). */
  variable: boolean;
  /** Counts as a housing cost in "Moradia". */
  housing: boolean;
  categoryId: ID | null;
  accountId: ID | null;
  active: boolean;
}

export interface BillPayment {
  id: ID;
  billId: ID;
  month: MonthKey;
  /** Real amount paid. */
  amount: number;
  paidOn: ISODate;
}

export interface Transaction {
  id: ID;
  date: ISODate;
  description: string;
  /** Signed: positive = money in, negative = money out. */
  amount: number;
  categoryId: ID | null;
  accountId: ID | null;
  /** Who it belongs to. null = the household / joint. */
  memberId: ID | null;
  note: string;
  /** Set when the row came from a bank file, to skip duplicates on re-import. */
  importHash: string | null;
}

export type Frequency = "monthly" | "yearly" | "irregular";

export interface IncomeSource {
  id: ID;
  memberId: ID;
  name: string;
  /** Expected amount per period (null for irregular income with no estimate). */
  amount: number | null;
  frequency: Frequency;
  /** Yearly only: month it usually arrives. */
  month: number | null;
  active: boolean;
}

export interface Goal {
  id: ID;
  name: string;
  kind: "reserve" | "goal";
  target: number | null;
  targetDate: ISODate | null;
  saved: number;
  accountId: ID | null;
}

export interface AnnualBill {
  id: ID;
  name: string;
  amount: number | null;
  dueMonth: number | null;
  /** Money already set aside for it. */
  setAside: number;
  payerId: ID | null;
}

export type InvestmentKind = "PPR" | "ETF" | "Certificados" | "Ações" | "Outro";

export interface Investment {
  id: ID;
  ownerId: ID | null;
  kind: InvestmentKind;
  name: string;
  invested: number;
  currentValue: number;
  updatedOn: ISODate;
  accountId: ID | null;
}

/** Auto-categorise imported rows whose description contains `pattern`. */
export interface Rule {
  id: ID;
  pattern: string;
  categoryId: ID;
  memberId: ID | null;
}

/** Saved column mapping for one bank account's CSV export. */
export interface ImportPreset {
  id: ID;
  accountId: ID;
  mapping: ColumnMapping;
}

export interface ColumnMapping {
  date: string;
  description: string;
  /** Either one signed amount column... */
  amount: string | null;
  /** ...or separate debit / credit columns. */
  debit: string | null;
  credit: string | null;
  dateFormat: "dmy" | "ymd" | "mdy";
  /** Optional column whose value must equal `stateOk` for the row to count (e.g. Revolut "State"). */
  stateColumn: string | null;
  stateOk: string | null;
}

export interface Tables {
  settings: Settings & { id: ID };
  member: Member;
  account: Account;
  category: Category;
  bill: Bill;
  billPayment: BillPayment;
  transaction: Transaction;
  incomeSource: IncomeSource;
  goal: Goal;
  annualBill: AnnualBill;
  investment: Investment;
  rule: Rule;
  importPreset: ImportPreset;
}

export type Kind = keyof Tables;

export type DB = { [K in Kind]: Tables[K][] };

export const KINDS: Kind[] = [
  "settings", "member", "account", "category", "bill", "billPayment", "transaction",
  "incomeSource", "goal", "annualBill", "investment", "rule", "importPreset",
];

export function emptyDB(): DB {
  return Object.fromEntries(KINDS.map((k) => [k, []])) as unknown as DB;
}
