// Starting data for a new household. Personal figures are never stored in the
// repository: they come from the setup wizard or from an imported setup file.
import type { Category, DB, Member, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./calc";
import { emptyDB } from "./types";
import { uid } from "./format";

type C = [name: string, group: string, kind: Category["kind"]];

const CATEGORIES: C[] = [
  ["Salário", "Salário", "income"],
  ["Subsídio de férias / Natal", "Salário", "income"],
  ["Trabalho extra", "Extra", "income"],
  ["Outros rendimentos", "Extra", "income"],
  ["Renda", "Casa", "expense"],
  ["Água", "Casa", "expense"],
  ["Eletricidade", "Casa", "expense"],
  ["Gás", "Casa", "expense"],
  ["Internet e telemóvel", "Casa", "expense"],
  ["Casa e manutenção", "Casa", "expense"],
  ["Supermercado", "Alimentação", "expense"],
  ["Restaurantes e cafés", "Alimentação", "expense"],
  ["Combustível", "Transporte", "expense"],
  ["Portagens e estacionamento", "Transporte", "expense"],
  ["Manutenção do carro", "Transporte", "expense"],
  ["Transportes públicos", "Transporte", "expense"],
  ["Seguros", "Seguros e impostos", "expense"],
  ["Impostos (IUC, IMI)", "Seguros e impostos", "expense"],
  ["Saúde e farmácia", "Saúde", "expense"],
  ["Surf", "Desporto", "expense"],
  ["Ginásio", "Desporto", "expense"],
  ["Lazer e saídas", "Lazer", "expense"],
  ["Viagens", "Lazer", "expense"],
  ["Subscrições", "Lazer", "expense"],
  ["Roupa", "Pessoal", "expense"],
  ["Cuidados pessoais", "Pessoal", "expense"],
  ["Presentes", "Pessoal", "expense"],
  ["Outras despesas", "Outros", "expense"],
  ["Contribuição conta conjunta", "Movimentos internos", "transfer"],
  ["Transferência entre contas", "Movimentos internos", "transfer"],
  ["Poupança", "Poupança e investimento", "saving"],
  ["Investimento", "Poupança e investimento", "saving"],
];

export function baseCategories(): Category[] {
  return CATEGORIES.map(([name, group, kind]) => ({ id: uid(), name, group, kind, budget: null }));
}

export interface WizardInput {
  householdName: string;
  people: { name: string; salary: number; jointContribution: number; subsidies: boolean; email: string | null }[];
}

export function newHousehold(input: WizardInput): DB {
  const db = emptyDB();
  const settings: Settings & { id: string } = { id: "settings", ...DEFAULT_SETTINGS, householdName: input.householdName || DEFAULT_SETTINGS.householdName };
  db.settings = [settings];
  db.member = input.people.map<Member>((p, i) => ({
    id: uid(),
    name: p.name || `Pessoa ${i + 1}`,
    email: p.email,
    color: i === 0 ? "p1" : "p2",
    salary: p.salary,
    payDay: null,
    jointContribution: p.jointContribution,
    subsidies: p.subsidies,
    order: i,
  }));
  db.category = baseCategories();
  db.goal = [{ id: uid(), name: "Fundo de emergência", kind: "reserve", target: null, targetDate: null, saved: 0, accountId: null }];
  return db;
}

/** A household full of made-up numbers, for trying the app before setting it up. */
export function demoHousehold(): DB {
  const db = newHousehold({
    householdName: "Casa a Dois",
    people: [
      { name: "Pessoa 1", salary: 1600, jointContribution: 950, subsidies: true, email: null },
      { name: "Pessoa 2", salary: 1300, jointContribution: 800, subsidies: true, email: null },
    ],
  });
  const cat = (n: string) => db.category.find((c) => c.name === n)!.id;
  const [p1, p2] = db.member;
  const joint = { id: uid(), ownerId: null, bank: "Banco", name: "Conta conjunta", kind: "current" as const, color: "#1d4ed8", openingBalance: 0, openingDate: "2026-01-01", closingDay: null, dueDay: null, creditLimit: null, archived: false };
  const a1 = { ...joint, id: uid(), ownerId: p1.id, name: "Conta à ordem", color: "#0f766e" };
  const a2 = { ...joint, id: uid(), ownerId: p2.id, name: "Conta à ordem", color: "#9333ea" };
  db.account = [joint, a1, a2];
  const bill = (name: string, amount: number, dueDay: number, c: string, housing: boolean, variable = false) => ({
    id: uid(), name, amount, dueDay, payerId: null, shared: true, variable, housing, categoryId: cat(c), accountId: joint.id, active: true,
  });
  db.bill = [
    bill("Renda", 600, 1, "Renda", true),
    bill("Internet", 40, 5, "Internet e telemóvel", true),
    bill("Eletricidade", 45, 15, "Eletricidade", true, true),
    bill("Água", 22, 18, "Água", true, true),
  ];
  const tx = (date: string, description: string, amount: number, c: string, memberId: string | null, accountId: string) => ({
    id: uid(), date, description, amount, categoryId: cat(c), accountId, memberId, note: "", importHash: null,
  });
  db.transaction = [
    tx("2026-11-03", "Continente", -84.3, "Supermercado", null, joint.id),
    tx("2026-11-06", "Galp", -55, "Combustível", p1.id, a1.id),
    tx("2026-11-08", "Jantar fora", -42.5, "Restaurantes e cafés", null, joint.id),
    tx("2026-11-09", "Zara", -39.9, "Roupa", p2.id, a2.id),
  ];
  db.annualBill = [{ id: uid(), name: "Seguro do carro", amount: 320, dueMonth: 3, setAside: 80, payerId: null }];
  return db;
}
