import { useStore } from "@/lib/store";
import { annualMonthly } from "@/lib/calc";
import { uid } from "@/lib/format";
import type { AnnualBill } from "@/lib/types";
import { Card, Money, PageHeader } from "@/components/ui";
import { EditTable, type Col } from "@/components/EditTable";

export default function Annual() {
  const { db } = useStore();
  const cols: Col<AnnualBill>[] = [
    { key: "name", label: "Conta", type: "text", placeholder: "ex. IUC" },
    { key: "amount", label: "Valor anual (€)", type: "number", width: "130px", placeholder: "falta" },
    { key: "dueMonth", label: "Mês", type: "month", width: "100px" },
    { key: "payerId", label: "Quem paga", type: "select", width: "140px", emptyLabel: "Conjunta", options: db.member.map((m) => [m.id, m.name]) },
    { key: "setAside", label: "Já posto de lado (€)", type: "number", width: "150px" },
  ];
  return (
    <>
      <PageHeader title="Contas anuais" sub={<>Seguros, IUC, IMI, inspeção… divididos por 12 meses. Pôr de lado por mês: <Money value={annualMonthly(db, "all")} className="font-semibold text-fg" />.</>} />
      <Card>
        <p className="text-muted text-[12.5px] mb-3">A parte mensal entra no saldo previsto de quem paga. Quando pagar a conta, ponha "Já posto de lado" a zero para recomeçar.</p>
        <EditTable kind="annualBill" rows={db.annualBill} cols={cols} minWidth={700} addLabel="Adicionar conta anual"
          make={() => ({ id: uid(), name: "", amount: null, dueMonth: null, setAside: 0, payerId: null })} />
      </Card>
    </>
  );
}
