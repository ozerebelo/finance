import { describe, expect, it } from "vitest";
import { billsForMonth, coupleForecast, dayToDay, housing, incomeFor, jointView, personalForecast, alerts } from "./calc";
import { newHousehold } from "./seed";
import type { DB } from "./types";
import { addMonths, splitAmount } from "./format";

function setup(): DB {
  const db = newHousehold({
    householdName: "Teste",
    people: [
      { name: "A", salary: 2000, jointContribution: 1000, subsidies: true, email: null },
      { name: "B", salary: 1000, jointContribution: 500, subsidies: false, email: null },
    ],
  });
  const cat = (n: string) => db.category.find((c) => c.name === n)!.id;
  db.bill = [
    { id: "rent", name: "Renda", amount: 600, dueDay: 1, payerId: null, shared: true, variable: false, housing: true, categoryId: cat("Renda"), accountId: null, active: true },
    { id: "gym", name: "Ginásio", amount: 30, dueDay: 10, payerId: db.member[0].id, shared: false, variable: false, housing: false, categoryId: cat("Ginásio"), accountId: null, active: true },
  ];
  db.transaction = [
    { id: "t1", date: "2026-03-05", description: "Supermercado", amount: -100, categoryId: cat("Supermercado"), accountId: null, memberId: null, note: "", importHash: null },
    { id: "t2", date: "2026-03-06", description: "Café", amount: -20, categoryId: cat("Restaurantes e cafés"), accountId: null, memberId: db.member[0].id, note: "", importHash: null },
    // Rent paid through the bank: counted through the bill, not as day-to-day spending.
    { id: "t3", date: "2026-03-01", description: "Renda", amount: -600, categoryId: cat("Renda"), accountId: null, memberId: null, note: "", importHash: null },
    // Moving money into the joint account is not spending.
    { id: "t4", date: "2026-03-01", description: "Transf", amount: -1000, categoryId: cat("Contribuição conta conjunta"), accountId: null, memberId: db.member[0].id, note: "", importHash: null },
  ];
  return db;
}

describe("income", () => {
  it("adds holiday pay in subsidy months only for people with 14 payments", () => {
    const db = setup();
    const [a, b] = db.member;
    expect(incomeFor(db, a, "2026-06").total).toBe(4000);
    expect(incomeFor(db, a, "2026-03").total).toBe(2000);
    expect(incomeFor(db, b, "2026-06").total).toBe(1000);
  });
  it("uses the real salary once it arrives", () => {
    const db = setup();
    const sal = db.category.find((c) => c.name === "Salário")!.id;
    db.transaction.push({ id: "s", date: "2026-03-25", description: "Ordenado", amount: 2050, categoryId: sal, accountId: null, memberId: db.member[0].id, note: "", importHash: null });
    const inc = incomeFor(db, db.member[0], "2026-03");
    expect(inc.total).toBe(2050);
    expect(inc.salaryIsActual).toBe(true);
  });
});

describe("spending", () => {
  it("excludes bill categories and internal transfers from day to day", () => {
    const db = setup();
    expect(dayToDay(db, "2026-03", "all")).toBe(120);
    expect(dayToDay(db, "2026-03", null)).toBe(100);
    expect(dayToDay(db, "2026-03", db.member[0].id)).toBe(20);
  });
});

describe("forecast", () => {
  it("personal: salary minus joint contribution, personal bills and day to day", () => {
    const db = setup();
    const f = personalForecast(db, db.member[0], "2026-03");
    expect(f.income).toBe(2000);
    expect(f.left).toBe(2000 - 1000 - 30 - 20);
  });
  it("couple: all income minus all bills and spending", () => {
    const db = setup();
    const f = coupleForecast(db, "2026-03");
    expect(f.income).toBe(3000);
    expect(f.left).toBe(3000 - 600 - 30 - 120);
  });
  it("uses the real bill amount once marked as paid", () => {
    const db = setup();
    db.billPayment.push({ id: "p", billId: "rent", month: "2026-03", amount: 610, paidOn: "2026-03-01" });
    expect(billsForMonth(db, "2026-03")[0].amount).toBe(610);
    expect(billsForMonth(db, addMonths("2026-03", 1))[0].amount).toBe(600);
  });
});

describe("joint account", () => {
  it("splits by contribution and shows the income-based share", () => {
    const db = setup();
    const j = jointView(db, "2026-03");
    expect(j.totalIn).toBe(1500);
    expect(j.contributions[0].share).toBeCloseTo(2 / 3);
    expect(j.contributions[0].fairShare).toBeCloseTo(2 / 3);
    expect(j.left).toBe(1500 - 600 - 100);
  });
  it("housing for one person uses their share of the joint account", () => {
    const db = setup();
    const h = housing(db, "2026-03", db.member[1]);
    expect(h.total).toBe(200);
    expect(h.pct).toBeCloseTo(0.2);
  });
});

describe("alerts", () => {
  it("flags bills due within the reminder window and overdue ones", () => {
    const db = setup();
    const a = alerts(db, "2026-03-08");
    expect(a.find((x) => x.id === "due-gym")?.text).toContain("2 dias");
    expect(a.find((x) => x.id === "late-rent")).toBeTruthy();
  });
});

describe("format", () => {
  it("splits amounts for the big number display", () => {
    const s = splitAmount(5304.28);
    expect(s.int.replace(/\s/g, "")).toBe("5304");
    expect(s.cents).toBe("28");
    expect(splitAmount(-12.5).neg).toBe(true);
  });
});
