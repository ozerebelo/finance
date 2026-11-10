import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Category, Transaction } from "@/lib/types";
import { members } from "@/lib/calc";
import { todayISO, uid, round2, monthOf } from "@/lib/format";
import { Field, Modal, NumberInput, Segmented, Toggle } from "./ui";
import { ruleKeyFor } from "@/lib/importer";

type Kind = "expense" | "income" | "transfer";

export function CategorySelect({ value, onChange, kinds, id, allowEmpty = true }: { value: string | null; onChange: (v: string | null) => void; kinds?: Category["kind"][]; id?: string; allowEmpty?: boolean }) {
  const { db } = useStore();
  const groups = useMemo(() => {
    const m = new Map<string, Category[]>();
    for (const c of db.category.filter((c) => !kinds || kinds.includes(c.kind)).sort((a, b) => a.name.localeCompare(b.name, "pt"))) {
      if (!m.has(c.group)) m.set(c.group, []);
      m.get(c.group)!.push(c);
    }
    return [...m.entries()];
  }, [db.category, kinds]);
  return (
    <select id={id} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">Sem categoria</option>}
      {groups.map(([g, cs]) => (
        <optgroup key={g} label={g}>
          {cs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function WhoSelect({ value, onChange, id }: { value: string | null; onChange: (v: string | null) => void; id?: string }) {
  const { db } = useStore();
  return (
    <select id={id} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Casa (conjunta)</option>
      {members(db).map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

export function AccountSelect({ value, onChange, id, allowEmpty = true }: { value: string | null; onChange: (v: string | null) => void; id?: string; allowEmpty?: boolean }) {
  const { db } = useStore();
  const name = (ownerId: string | null) => (ownerId ? db.member.find((m) => m.id === ownerId)?.name ?? "" : "Conjunta");
  return (
    <select id={id} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">Sem conta</option>}
      {db.account.filter((a) => !a.archived || a.id === value).map((a) => (
        <option key={a.id} value={a.id}>
          {a.bank} · {a.name} ({name(a.ownerId)})
        </option>
      ))}
    </select>
  );
}

export function TransactionModal({ open, onClose, kind: initialKind = "expense", tx }: { open: boolean; onClose: () => void; kind?: Kind; tx?: Transaction }) {
  const { db, save, saveMany, remove, me, month } = useStore();
  const cats = new Map(db.category.map((c) => [c.id, c]));
  const startKind: Kind = tx ? (tx.categoryId && ["transfer", "saving"].includes(cats.get(tx.categoryId)?.kind ?? "") ? "transfer" : tx.amount > 0 ? "income" : "expense") : initialKind;
  const [kind, setKind] = useState<Kind>(startKind);
  const defaultAccount = db.account.find((a) => a.ownerId === me?.id && a.kind === "current" && !a.archived) ?? db.account.find((a) => !a.archived) ?? null;
  const thisMonth = monthOf(todayISO()) === month;
  const [amount, setAmount] = useState<number | null>(tx ? Math.abs(tx.amount) : null);
  const [description, setDescription] = useState(tx?.description ?? "");
  const [date, setDate] = useState(tx?.date ?? (thisMonth ? todayISO() : `${month}-01`));
  const [categoryId, setCategoryId] = useState<string | null>(tx?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(tx ? tx.accountId : defaultAccount?.id ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(tx ? tx.memberId : defaultAccount?.ownerId ?? me?.id ?? null);
  const [note, setNote] = useState(tx?.note ?? "");
  const [learn, setLearn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickAccount = (id: string | null) => {
    setAccountId(id);
    const a = db.account.find((x) => x.id === id);
    if (a && !tx) setMemberId(a.ownerId);
  };

  const submit = async () => {
    if (!amount || amount <= 0) return setErr("Indique um valor maior que zero.");
    if (kind === "transfer" && !tx) {
      if (!accountId || !toAccountId || accountId === toAccountId) return setErr("Escolha duas contas diferentes.");
      const from = db.account.find((a) => a.id === accountId)!;
      const to = db.account.find((a) => a.id === toAccountId)!;
      const catName = to.ownerId === null && from.ownerId !== null ? "Contribuição conta conjunta" : to.kind === "savings" ? "Poupança" : to.kind === "investment" ? "Investimento" : "Transferência entre contas";
      const cat = db.category.find((c) => c.name === catName) ?? db.category.find((c) => c.kind === "transfer");
      const desc = description || `Transferência para ${to.name}`;
      await saveMany("transaction", [
        { id: uid(), date, description: desc, amount: -round2(amount), categoryId: cat?.id ?? null, accountId: from.id, memberId: from.ownerId, note, importHash: null },
        { id: uid(), date, description: desc, amount: round2(amount), categoryId: db.category.find((c) => c.name === "Transferência entre contas")?.id ?? cat?.id ?? null, accountId: to.id, memberId: to.ownerId, note, importHash: null },
      ]);
      return onClose();
    }
    const signed = kind === "income" ? round2(amount) : -round2(amount);
    const row: Transaction = { id: tx?.id ?? uid(), date, description: description || (categoryId ? cats.get(categoryId)?.name ?? "" : "Movimento"), amount: tx && kind === "transfer" ? (tx.amount < 0 ? -round2(amount) : round2(amount)) : signed, categoryId, accountId, memberId, note, importHash: tx?.importHash ?? null };
    await save("transaction", row);
    if (learn && categoryId && description.trim()) {
      const pattern = ruleKeyFor(description);
      const existing = db.rule.find((r) => r.pattern === pattern);
      await save("rule", { id: existing?.id ?? uid(), pattern, categoryId, memberId });
    }
    onClose();
  };

  const catKinds: Category["kind"][] = kind === "income" ? ["income"] : kind === "transfer" ? ["transfer", "saving"] : ["expense"];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tx ? "Editar movimento" : kind === "income" ? "Nova receita" : kind === "transfer" ? "Nova transferência" : "Nova despesa"}
      footer={
        <>
          {tx &&
            (confirmDelete ? (
              <button className="btn-danger mr-auto" onClick={async () => { await remove("transaction", tx.id); onClose(); }}>
                Confirmar apagar
              </button>
            ) : (
              <button className="btn-danger mr-auto" onClick={() => setConfirmDelete(true)}>
                Apagar
              </button>
            ))}
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={submit}>
            Guardar
          </button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {!tx && (
          <Segmented className="col-span-2" value={kind} onChange={(k) => { setKind(k); setCategoryId(null); }} options={[["expense", "Despesa"], ["income", "Receita"], ["transfer", "Transferência"]]} />
        )}
        <Field label="Valor (€)">{(id) => <NumberInput id={id} value={amount} onChange={setAmount} placeholder="0,00" className="text-[18px] h-11 font-semibold" />}</Field>
        <Field label="Data">{(id) => <input id={id} type="date" className="input h-11" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Field label="Descrição" className="col-span-2">{(id) => <input id={id} className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === "income" ? "ex. Ordenado" : "ex. Continente"} />}</Field>
        {kind === "transfer" && !tx ? (
          <>
            <Field label="De">{(id) => <AccountSelect id={id} value={accountId} onChange={setAccountId} allowEmpty={false} />}</Field>
            <Field label="Para">{(id) => <AccountSelect id={id} value={toAccountId} onChange={setToAccountId} />}</Field>
          </>
        ) : (
          <>
            <Field label="Categoria" className="col-span-2 sm:col-span-1">{(id) => <CategorySelect id={id} value={categoryId} onChange={setCategoryId} kinds={tx ? undefined : catKinds} />}</Field>
            <Field label="De quem" className="col-span-2 sm:col-span-1">{(id) => <WhoSelect id={id} value={memberId} onChange={setMemberId} />}</Field>
            <Field label="Conta" className="col-span-2">{(id) => <AccountSelect id={id} value={accountId} onChange={pickAccount} />}</Field>
          </>
        )}
        <Field label="Nota" className="col-span-2">{(id) => <input id={id} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" />}</Field>
        {tx && kind !== "transfer" && (
          <div className="col-span-2">
            <Toggle checked={learn} onChange={setLearn} label="Usar esta categoria para movimentos parecidos nas próximas importações" />
          </div>
        )}
        {err && <p className="col-span-2 text-bad text-[13px]">{err}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
