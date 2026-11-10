import { useStore } from "@/lib/store";
import { uid } from "@/lib/format";
import type { Category, Rule } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { EditTable, type Col } from "@/components/EditTable";
import { CategorySelect } from "@/components/TransactionModal";

export default function Categories() {
  const { db, save } = useStore();
  const rows = [...db.category].sort((a, b) => a.kind.localeCompare(b.kind) || a.group.localeCompare(b.group, "pt") || a.name.localeCompare(b.name, "pt"));
  const used = new Set([...db.transaction.map((t) => t.categoryId), ...db.bill.map((b) => b.categoryId)]);
  const cols: Col<Category>[] = [
    { key: "name", label: "Categoria", type: "text" },
    { key: "group", label: "Grupo", type: "text", width: "200px" },
    { key: "kind", label: "Tipo", type: "select", width: "170px", options: [["expense", "Despesa"], ["income", "Rendimento"], ["transfer", "Movimento interno"], ["saving", "Poupança / investimento"]] },
    { key: "budget", label: "Orçamento (€)", type: "number", width: "130px" },
  ];
  const ruleCols: Col<Rule>[] = [
    { key: "pattern", label: "Se a descrição contém", type: "text", placeholder: "ex. continente" },
    { key: "categoryId", label: "Categoria", type: "select", width: "220px", render: (r) => <CategorySelect value={r.categoryId} onChange={(v) => v && save("rule", { ...r, categoryId: v })} allowEmpty={false} /> },
    { key: "memberId", label: "De quem", type: "select", width: "150px", emptyLabel: "(da conta)", options: db.member.map((m) => [m.id, m.name]) },
  ];
  return (
    <>
      <PageHeader title="Categorias e regras" sub="Rendimentos do grupo 'Salário' substituem o salário previsto. Movimentos internos e poupança não contam como gasto." />
      <div className="grid gap-5">
        <Card title="Regras de importação">
          <p className="text-muted text-[12.5px] mb-3">Ao importar extratos, estas regras escolhem a categoria (em minúsculas, sem acentos). Também pode criar regras ao editar um movimento.</p>
          <EditTable kind="rule" rows={db.rule} cols={ruleCols} minWidth={620} addLabel="Adicionar regra" empty="Ainda sem regras."
            make={() => ({ id: uid(), pattern: "", categoryId: db.category.find((c) => c.kind === "expense")?.id ?? "", memberId: null })} />
        </Card>
        <Card title="Categorias">
          <EditTable kind="category" rows={rows} cols={cols} minWidth={680} addLabel="Adicionar categoria" canDelete={(c) => !used.has(c.id)}
            make={() => ({ id: uid(), name: "", group: "Outros", kind: "expense", budget: null })} />
          <p className="text-muted text-[12px] mt-2">Categorias em uso não podem ser apagadas.</p>
        </Card>
      </div>
    </>
  );
}
