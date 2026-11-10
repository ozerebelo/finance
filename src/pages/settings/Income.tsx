import { useStore } from "@/lib/store";
import { expectedIncome, settingsOf } from "@/lib/calc";
import { MONTHS, uid } from "@/lib/format";
import type { IncomeSource, Member } from "@/lib/types";
import { Card, Field, Money, PageHeader } from "@/components/ui";
import { EditTable, type Col } from "@/components/EditTable";

export default function Income() {
  const { db, save, month } = useStore();
  const s = settingsOf(db);
  const ms = [...db.member].sort((a, b) => a.order - b.order);
  const memberCols: Col<Member>[] = [
    { key: "name", label: "Nome", type: "text" },
    { key: "salary", label: "Salário líquido (€)", type: "number", width: "140px" },
    { key: "payDay", label: "Dia do salário", type: "day", width: "100px" },
    { key: "jointContribution", label: "Põe na conjunta (€)", type: "number", width: "150px" },
    { key: "subsidies", label: "14 meses", type: "bool", width: "80px" },
    { key: "color", label: "Cor", type: "select", width: "100px", options: [["p1", "Azul"], ["p2", "Rosa"]] },
    { key: "email", label: "E-mail de login", type: "text", placeholder: "para entrar na app" },
  ];
  const srcCols: Col<IncomeSource>[] = [
    { key: "name", label: "Fonte", type: "text", placeholder: "ex. Freelance" },
    { key: "memberId", label: "De quem", type: "select", width: "130px", options: ms.map((m) => [m.id, m.name]) },
    { key: "frequency", label: "Frequência", type: "select", width: "130px", options: [["monthly", "Mensal"], ["yearly", "Anual"], ["irregular", "Irregular"]] },
    { key: "amount", label: "Valor previsto (€)", type: "number", width: "140px", placeholder: "—" },
    { key: "month", label: "Mês (anual)", type: "month", width: "110px" },
    { key: "active", label: "Ativa", type: "bool", width: "70px" },
  ];
  const setSub = (i: number, v: number) => {
    const next = [...s.subsidyMonths];
    next[i] = v;
    save("settings", { ...s, id: "settings", subsidyMonths: next });
  };
  return (
    <>
      <PageHeader title="Nossa renda" sub="Salários, quanto cada um põe na conta conjunta e outras fontes de rendimento. Tudo o que muda aqui atualiza o saldo previsto." />
      <div className="grid gap-5">
        <Card title="Pessoas e salários">
          <p className="text-muted text-[12.5px] mb-3">"14 meses" soma o subsídio de férias e de Natal como um salário extra nos meses abaixo. Quando o ordenado real é importado (categoria Salário), substitui o previsto nesse mês.</p>
          <EditTable kind="member" rows={ms} cols={memberCols} minWidth={900} addLabel="Adicionar pessoa" canDelete={() => ms.length > 1}
            make={() => ({ id: uid(), name: "", email: null, color: ms.length % 2 ? "p2" : "p1", salary: 0, payDay: null, jointContribution: 0, subsidies: true, order: ms.length })} />
          <div className="mt-4 flex flex-wrap gap-3 items-end">
            <Field label="Subsídio de férias em">{(id) => <select id={id} className="input w-40" value={s.subsidyMonths[0] ?? 6} onChange={(e) => setSub(0, Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>}</Field>
            <Field label="Subsídio de Natal em">{(id) => <select id={id} className="input w-40" value={s.subsidyMonths[1] ?? 11} onChange={(e) => setSub(1, Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>}</Field>
          </div>
        </Card>
        <Card title="Outros rendimentos">
          <p className="text-muted text-[12.5px] mb-3">Rendimentos irregulares não entram na previsão: contam quando os importar ou adicionar com a categoria "Trabalho extra" ou "Outros rendimentos".</p>
          <EditTable kind="incomeSource" rows={db.incomeSource} cols={srcCols} minWidth={760} addLabel="Adicionar fonte"
            make={() => ({ id: uid(), memberId: ms[0]?.id ?? "", name: "", amount: null, frequency: "irregular", month: null, active: true })} />
        </Card>
        <Card title="Previsto para este mês">
          <ul className="mt-2">
            {ms.map((m) => {
              const e = expectedIncome(db, m, month);
              return (
                <li key={m.id} className="row-line flex flex-wrap gap-x-6 gap-y-1 py-2.5 text-[13.5px]">
                  <span className="font-semibold w-28">{m.name}</span>
                  <span>Salário <Money value={e.salary} /></span>
                  {e.subsidy > 0 && <span className="text-good">+ subsídio <Money value={e.subsidy} /></span>}
                  {e.extras > 0 && <span>+ outros <Money value={e.extras} /></span>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
