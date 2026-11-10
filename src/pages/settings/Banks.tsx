import { useStore } from "@/lib/store";
import { uid, todayISO } from "@/lib/format";
import type { Account } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { EditTable, type Col } from "@/components/EditTable";
import { BankCard } from "@/components/widgets";

export default function Banks() {
  const { db } = useStore();
  const cols: Col<Account>[] = [
    { key: "bank", label: "Banco", type: "text", width: "130px", placeholder: "ex. CGD" },
    { key: "name", label: "Nome", type: "text", placeholder: "ex. Conta conjunta" },
    { key: "ownerId", label: "De quem", type: "select", width: "120px", emptyLabel: "Conjunta", options: db.member.map((m) => [m.id, m.name]) },
    { key: "kind", label: "Tipo", type: "select", width: "130px", options: [["current", "À ordem"], ["savings", "Poupança"], ["credit", "Cartão de crédito"], ["meal", "Cartão refeição"], ["investment", "Investimento"]] },
    { key: "color", label: "Cor", type: "color", width: "60px" },
    { key: "openingBalance", label: "Saldo inicial (€)", type: "number", width: "130px" },
    { key: "openingDate", label: "Em (data)", type: "text", width: "110px", placeholder: "2026-11-01" },
    { key: "closingDay", label: "Fecho", type: "day", width: "76px" },
    { key: "dueDay", label: "Pagto.", type: "day", width: "76px" },
    { key: "creditLimit", label: "Limite (€)", type: "number", width: "110px" },
    { key: "archived", label: "Arquivada", type: "bool", width: "80px" },
  ];
  return (
    <>
      <PageHeader title="Bancos e cartões" sub="As contas de onde vêm os extratos. O saldo = saldo inicial na data indicada + movimentos importados a partir dessa data. Fecho, pagamento e limite são só para cartões de crédito." />
      <div className="-mx-4 lg:mx-0 flex gap-3 overflow-x-auto px-4 lg:px-0 pb-4 pt-1">
        {db.account.filter((a) => !a.archived).map((a) => <BankCard key={a.id} account={a} />)}
      </div>
      <Card>
        <EditTable kind="account" rows={db.account} cols={cols} minWidth={1180} addLabel="Adicionar conta ou cartão"
          make={() => ({ id: uid(), ownerId: null, bank: "", name: "", kind: "current", color: "#243e89", openingBalance: 0, openingDate: todayISO().slice(0, 8) + "01", closingDay: null, dueDay: null, creditLimit: null, archived: false })} />
      </Card>
    </>
  );
}
