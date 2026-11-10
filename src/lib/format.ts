import type { ISODate, MonthKey } from "./types";

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
const intFmt = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0, useGrouping: "always" } as unknown as Intl.NumberFormatOptions);

export const fmtEUR = (n: number) => eur.format(round2(n));
export const fmtEUR0 = (n: number) => eur0.format(Math.round(n));
export const fmtPct = (n: number, digits = 0) =>
  `${(n * 100).toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

/** Splits 1234.5 into { int: "1 234", cents: "50" } for the big-number display. */
export function splitAmount(n: number) {
  const s = num.format(Math.abs(round2(n)));
  const [int, cents] = s.split(",");
  return { neg: n < -0.004, int: int ?? "0", cents: cents ?? "00" };
}
export const fmtInt = (n: number) => intFmt.format(n);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------- dates ----------
export const pad = (n: number) => String(n).padStart(2, "0");
export const todayISO = (): ISODate => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthOf = (d: ISODate): MonthKey => d.slice(0, 7);
export const currentMonth = (): MonthKey => monthOf(todayISO());
export function addMonths(m: MonthKey, delta: number): MonthKey {
  const [y, mo] = m.split("-").map(Number);
  const idx = y * 12 + (mo - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}
export const monthNum = (m: MonthKey) => Number(m.slice(5, 7));
export const yearOf = (m: MonthKey) => Number(m.slice(0, 4));
export const monthLabel = (m: MonthKey) => `${MONTHS[monthNum(m) - 1]} ${yearOf(m)}`;
export const monthShort = (m: MonthKey) => `${MONTHS_SHORT[monthNum(m) - 1]} ${String(yearOf(m)).slice(2)}`;
export function daysInMonth(m: MonthKey) {
  return new Date(yearOf(m), monthNum(m), 0).getDate();
}
/** Due date of a day-of-month in a given month, clamped to the month's last day. */
export const dueDate = (m: MonthKey, day: number): ISODate => `${m}-${pad(Math.min(day, daysInMonth(m)))}`;
export function daysBetween(a: ISODate, b: ISODate) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
export const fmtDate = (d: ISODate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const fmtDateLong = (d: ISODate) => `${Number(d.slice(8, 10))} ${MONTHS_SHORT[Number(d.slice(5, 7)) - 1].toLowerCase()} ${d.slice(0, 4)}`;

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
