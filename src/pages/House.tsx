import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { billsForMonth } from "@/lib/calc";
import { monthLabel } from "@/lib/format";
import { HousingCard, SplitCard, BillRow, useBillToggle } from "@/components/widgets";
import { Card, Money, PageHeader } from "@/components/ui";

export default function House() {
  const { db, month } = useStore();
  const lines = billsForMonth(db, month);
  const { toggle, modal } = useBillToggle();
  const paid = lines.filter((l) => l.paid).reduce((s, l) => s + l.amount, 0);
  const all = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <>
      <PageHeader title="Nossa casa" sub="A conta conjunta, as contas da casa e quanto custa morar." actions={<Link to="/ajustes/contas-casa" className="btn-ghost">Editar contas</Link>} />
      <div className="grid gap-4 lg:gap-5 lg:grid-cols-3 items-start">
        <Card title={`Contas de ${monthLabel(month).toLowerCase()}`}>
          <p className="text-muted text-[12.5px] mt-1">
            Pago <Money value={paid} className="font-semibold text-fg" /> de <Money value={all} className="font-semibold text-fg" />. Contas variáveis pedem o valor real ao marcar.
          </p>
          <ul className="mt-2">
            {lines.map((l) => <BillRow key={l.bill.id} line={l} onToggle={() => toggle(l)} showDue />)}
          </ul>
        </Card>
        <SplitCard />
        <HousingCard />
      </div>
      {modal}
    </>
  );
}
