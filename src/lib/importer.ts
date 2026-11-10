// Bank statement import: parse a CSV, find the header row, map columns,
// turn rows into transactions, drop duplicates and suggest categories.
import Papa from "papaparse";
import type { Category, ColumnMapping, DB, ISODate, Rule, Transaction } from "./types";
import { pad, round2 } from "./format";

export interface ParsedFile {
  headers: string[];
  rows: string[][];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Banks often put account details above the table; find the real header row. */
export function parseCSV(text: string): ParsedFile {
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy", delimiter: "" });
  const all = (res.data as string[][]).map((r) => r.map((c) => (c ?? "").trim()));
  let headerIdx = all.findIndex((r) => {
    const n = r.map(norm);
    return n.some((c) => /^(data|date|started date|completed date|data mov|data valor|data lanc)/.test(c)) && n.some((c) => /(montante|valor|amount|debito|credito|importancia)/.test(c));
  });
  if (headerIdx < 0) headerIdx = 0;
  const headers = all[headerIdx].map((h, i) => h || `Coluna ${i + 1}`);
  const rows = all.slice(headerIdx + 1).filter((r) => r.length >= Math.min(headers.length, 2) && r.some((c) => c));
  return { headers, rows };
}

export function guessMapping(headers: string[]): ColumnMapping {
  const n = headers.map(norm);
  const find = (...re: RegExp[]) => {
    for (const r of re) {
      const i = n.findIndex((h) => r.test(h));
      if (i >= 0) return headers[i];
    }
    return null;
  };
  // Revolut: Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
  const isRevolut = n.includes("started date") && n.includes("state");
  return {
    date: find(/^completed date/, /^data mov/, /^data lanc/, /^data$/, /^date$/, /^data/, /date/) ?? headers[0],
    description: find(/^descri/, /^description/, /^movimento/, /^detalhe/, /^referencia/, /narrative/) ?? headers[1] ?? headers[0],
    amount: find(/^montante/, /^amount$/, /^valor$/, /^importancia/, /^valor \(/) ,
    debit: find(/^debito/, /^debit/, /saida/),
    credit: find(/^credito/, /^credit/, /entrada/),
    dateFormat: isRevolut ? "ymd" : "dmy",
    stateColumn: isRevolut ? headers[n.indexOf("state")] : null,
    stateOk: isRevolut ? "COMPLETED" : null,
  };
}

export function parseAmount(s: string): number | null {
  let t = (s ?? "").replace(/\s|€|EUR/gi, "").replace(/[−]/g, "-");
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) {
    neg = true;
    t = t.slice(1, -1);
  }
  if (t.endsWith("-")) {
    neg = true;
    t = t.slice(0, -1);
  }
  if (t.includes(",") && t.includes(".")) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

export function parseDate(s: string, fmt: ColumnMapping["dateFormat"]): ISODate | null {
  const t = (s ?? "").trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(t);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const [d, mo] = fmt === "mdy" ? [+m[2], +m[1]] : [+m[1], +m[2]];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

export const hashOf = (accountId: string, date: string, amount: number, desc: string) => `${accountId}|${date}|${amount.toFixed(2)}|${norm(desc).replace(/\s+/g, " ")}`;

/** Short, stable key for a description, used by learned rules: "COMPRA 1234 CONTINENTE LISBOA" → "continente lisboa". */
export function ruleKeyFor(desc: string): string {
  const words = norm(desc)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/\d/.test(w) && !["compra", "pagamento", "pag", "trf", "transf", "transferencia", "mbway", "debito", "direto", "cartao", "com", "para", "de"].includes(w));
  return words.slice(0, 2).join(" ") || norm(desc).slice(0, 20);
}

// Built-in hints for common Portuguese merchants, used when no learned rule matches.
const HINTS: [RegExp, string][] = [
  [/continente|pingo doce|lidl|aldi|auchan|intermarche|minipreco|mercadona|el corte ingles super|supermerc/, "Supermercado"],
  [/galp|repsol|bp |prio|cepsa|combust/, "Combustível"],
  [/via verde|brisa|portagem|empark|parque|estaciona|emel|telpark/, "Portagens e estacionamento"],
  [/uber eats|glovo|bolt food|restaur|cafe|pastelaria|mcdonald|burger|pizza|sushi|tasca/, "Restaurantes e cafés"],
  [/uber|bolt|cp |comboios|metro|carris|navegante|fertagus|flixbus/, "Transportes públicos"],
  [/farmacia|wells|clinica|hospital|cuf|lusiadas|dentist|medic/, "Saúde e farmácia"],
  [/netflix|spotify|disney|hbo|max\.com|apple\.com|icloud|youtube|amazon prime|prime video|google one/, "Subscrições"],
  [/edp|endesa|goldenergy|iberdrola|galp energia|luz /, "Eletricidade"],
  [/epal|smas|aguas de|agua /, "Água"],
  [/vodafone|meo|nos |nowo|digi/, "Internet e telemóvel"],
  [/ryanair|tap |easyjet|booking|airbnb|hotel|vueling/, "Viagens"],
  [/zara|primark|h&m|bershka|pull&bear|decathlon|sport zone|mango|uniqlo/, "Roupa"],
  [/fidelidade|allianz|ageas|tranquilidade|generali|zurich|seguro/, "Seguros"],
  [/at - autoridade|autoridade tributaria|portal das financas|iuc|imi /, "Impostos (IUC, IMI)"],
  [/ginasio|fitness|holmes place|solinca|gym/, "Ginásio"],
  [/surf/, "Surf"],
  [/salario|vencimento|ordenado/, "Salário"],
];

export function suggestCategory(desc: string, amount: number, rules: Rule[], cats: Category[]): { categoryId: string | null; memberId?: string | null; source: "rule" | "hint" | null } {
  const d = norm(desc);
  const rule = rules.filter((r) => r.pattern && d.includes(r.pattern)).sort((a, b) => b.pattern.length - a.pattern.length)[0];
  if (rule) return { categoryId: rule.categoryId, memberId: rule.memberId, source: "rule" };
  for (const [re, name] of HINTS) {
    if (re.test(d + " ")) {
      const c = cats.find((x) => x.name === name);
      if (c && ((c.kind === "income") === amount > 0)) return { categoryId: c.id, source: "hint" };
    }
  }
  return { categoryId: null, source: null };
}

export interface Draft extends Transaction {
  duplicate: boolean;
  include: boolean;
  suggested: "rule" | "hint" | null;
}

export function buildDrafts(db: DB, file: ParsedFile, map: ColumnMapping, accountId: string, memberId: string | null): { drafts: Draft[]; skipped: number } {
  const idx = (h: string | null) => (h ? file.headers.indexOf(h) : -1);
  const iDate = idx(map.date), iDesc = idx(map.description), iAmt = idx(map.amount), iDeb = idx(map.debit), iCred = idx(map.credit), iState = idx(map.stateColumn);
  const existing = new Set(db.transaction.filter((t) => t.importHash).map((t) => t.importHash!));
  const seen = new Set<string>();
  const drafts: Draft[] = [];
  let skipped = 0;
  for (const r of file.rows) {
    if (iState >= 0 && map.stateOk && norm(r[iState] ?? "") !== norm(map.stateOk)) {
      skipped++;
      continue;
    }
    const date = parseDate(r[iDate] ?? "", map.dateFormat);
    let amount: number | null = null;
    if (iAmt >= 0) amount = parseAmount(r[iAmt] ?? "");
    else {
      const deb = iDeb >= 0 ? parseAmount(r[iDeb] ?? "") : null;
      const cred = iCred >= 0 ? parseAmount(r[iCred] ?? "") : null;
      if (deb != null || cred != null) amount = (cred ? Math.abs(cred) : 0) - (deb ? Math.abs(deb) : 0);
    }
    if (!date || amount == null || amount === 0) {
      skipped++;
      continue;
    }
    amount = round2(amount);
    const description = (r[iDesc] ?? "").replace(/\s+/g, " ").trim() || "Movimento";
    let h = hashOf(accountId, date, amount, description);
    // Two identical rows on the same day in one file are real (two coffees): number them.
    let n = 1;
    while (seen.has(h)) h = hashOf(accountId, date, amount, description) + "#" + ++n;
    seen.add(h);
    const s = suggestCategory(description, amount, db.rule, db.category);
    drafts.push({
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      date,
      description,
      amount,
      categoryId: s.categoryId,
      accountId,
      memberId: s.memberId !== undefined ? s.memberId : memberId,
      note: "",
      importHash: h,
      duplicate: existing.has(h),
      include: !existing.has(h),
      suggested: s.source,
    });
  }
  drafts.sort((a, b) => b.date.localeCompare(a.date));
  return { drafts, skipped };
}
