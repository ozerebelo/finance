import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import type { Bill } from "@/lib/types";
import { Card, Money, PageHeader } from "@/components/ui";
import { EditTable, type Col } from "@/components/EditTable";
import { CategorySelect } from "@/components/TransactionModal";

export default function Bills() {
  const { db, save } = useStore();
  const rows = [...db.bill].sort((a, b) => a.dueDay - b.dueDay);
  const cols: Col<Bill>[] = [
    { key: "name", label: "Conta", type: "text", placeholder: "ex. Eletricidade" },
    { key: "amount", label: "Valor (€)", type: "number", width: "110px" },
    { key: "dueDay", label: "Dia", type: "day", width: "80px" },
    { key: "payerId", label: "Quem paga", type: "select", width: "140px", emptyLabel: "Conjunta", options: db.member.map((m) => [m.id, m.name]) },
    { key: "variable", label: "Varia", type: "bool", width: "64px" },
    { key: "housing", label: "Habitação", type: "bool", width: "84px" },
    { key: "categoryId", label: "Categoria", type: "select", width: "190px", render: (b) => <CategorySelect value={b.categoryId} onChange={(v) => save("bill", { ...b, categoryId: v })} kinds={["expense"]} /> },
    { key: "active", label: "Ativa", type: "bool", width: "60px" },
  ];
  const total = rows.filter((b) => b.active).reduce((s, b) => s + b.amount, 0);
  return (
    <>
      <PageHeader title="Contas da casa" sub={<>Contas que se repetem todos os meses. Total: <Money value={total} className="font-semibold text-fg" /> por mês.</>} />
      <Card>
        <ul className="text-muted text-[12.5px] mb-4 grid gap-1 list-disc pl-4">
          <li><b className="text-fg">Varia</b>: o valor muda todos os meses (água, luz). Ao marcar como paga, indica o valor real.</li>
          <li><b className="text-fg">Habitação</b>: entra no cartão Moradia (custo de morar face ao salário).</li>
          <li><b className="text-fg">Categoria</b>: os movimentos importados nesta categoria são contados pela conta, não como dia a dia, para não contar a dobrar.</li>
        </ul>
        <EditTable kind="bill" rows={rows} cols={cols} minWidth={880} addLabel="Adicionar conta"
          make={() => ({ id: uid(), name: "", amount: 0, dueDay: 1, payerId: null, shared: true, variable: false, housing: false, categoryId: null, accountId: null, active: true })} />
      </Card>
    </>
  );
}
