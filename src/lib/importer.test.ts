import { describe, expect, it } from "vitest";
import { buildDrafts, guessMapping, parseAmount, parseCSV, parseDate, ruleKeyFor } from "./importer";
import { newHousehold } from "./seed";

describe("parsing", () => {
  it("reads Portuguese and English amounts", () => {
    expect(parseAmount("-1.234,56")).toBe(-1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("12,5 €")).toBe(12.5);
    expect(parseAmount("(30,00)")).toBe(-30);
    expect(parseAmount("")).toBeNull();
  });
  it("reads dates", () => {
    expect(parseDate("05-11-2026", "dmy")).toBe("2026-11-05");
    expect(parseDate("2026-11-05 10:22:01", "ymd")).toBe("2026-11-05");
    expect(parseDate("5/11/26", "dmy")).toBe("2026-11-05");
  });
  it("makes stable rule keys", () => {
    expect(ruleKeyFor("COMPRA 4521 CONTINENTE LISBOA")).toBe("continente lisboa");
  });
});

describe("bank files", () => {
  it("finds the header below account details and uses debit/credit columns", () => {
    const csv = ["Conta;0001234", "Período;01-11-2026 a 10-11-2026", "", "Data mov.;Data valor;Descrição;Débito;Crédito;Saldo", "03-11-2026;03-11-2026;COMPRA CONTINENTE;45,20;;1.000,00", "05-11-2026;05-11-2026;TRF RECEBIDA;;1.000,00;2.000,00"].join("\n");
    const f = parseCSV(csv);
    expect(f.headers[2]).toBe("Descrição");
    const m = guessMapping(f.headers);
    expect(m.debit).toBe("Débito");
    const db = newHousehold({ householdName: "t", people: [{ name: "A", salary: 1, jointContribution: 1, subsidies: false, email: null }] });
    const { drafts } = buildDrafts(db, f, m, "acc", null);
    expect(drafts.map((d) => d.amount)).toEqual([1000, -45.2]);
    expect(db.category.find((c) => c.id === drafts[1].categoryId)?.name).toBe("Supermercado");
  });
  it("handles Revolut and skips pending rows and duplicates", () => {
    const csv = [
      "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance",
      "CARD_PAYMENT,Current,2026-11-02 12:00:00,2026-11-03 09:00:00,Spotify,-10.99,0.00,EUR,COMPLETED,100",
      "CARD_PAYMENT,Current,2026-11-04 12:00:00,,Galp,-40.00,0.00,EUR,PENDING,60",
    ].join("\n");
    const f = parseCSV(csv);
    const m = guessMapping(f.headers);
    const db = newHousehold({ householdName: "t", people: [{ name: "A", salary: 1, jointContribution: 1, subsidies: false, email: null }] });
    const first = buildDrafts(db, f, m, "rev", null);
    expect(first.drafts).toHaveLength(1);
    expect(first.skipped).toBe(1);
    db.transaction.push(first.drafts[0]);
    expect(buildDrafts(db, f, m, "rev", null).drafts[0].duplicate).toBe(true);
  });
});
