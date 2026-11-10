import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { buildDrafts, guessMapping, parseCSV, type Draft, type ParsedFile } from "@/lib/importer";
import type { ColumnMapping } from "@/lib/types";
import { fmtDate, uid } from "@/lib/format";
import { Field, Modal, Money, Notice, cx } from "./ui";
import { AccountSelect, CategorySelect, WhoSelect } from "./TransactionModal";

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, saveMany, save } = useStore();
  const [accountId, setAccountId] = useState<string | null>(db.account.find((a) => !a.archived)?.id ?? null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [map, setMap] = useState<ColumnMapping | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const account = db.account.find((a) => a.id === accountId);

  const onFile = async (f: File) => {
    setErr(null);
    setDrafts(null);
    try {
      let text = await f.text();
      // Some Portuguese banks export Windows-1252; re-read if the UTF-8 decode produced replacement chars.
      if (text.includes("�")) text = new TextDecoder("windows-1252").decode(await f.arrayBuffer());
      const parsed = parseCSV(text);
      if (!parsed.rows.length) throw new Error("Não encontrei linhas com movimentos neste ficheiro.");
      setFile(parsed);
      setFileName(f.name);
      const preset = db.importPreset.find((p) => p.accountId === accountId);
      const m = preset && preset.mapping.date && parsed.headers.includes(preset.mapping.date) ? preset.mapping : guessMapping(parsed.headers);
      setMap(m);
    } catch (e) {
      setErr((e as Error).message || "Não consegui ler o ficheiro. Exporte o extrato em CSV e tente de novo.");
    }
  };

  const preview = () => {
    if (!file || !map || !accountId) return;
    const r = buildDrafts(db, file, map, accountId, account?.ownerId ?? null);
    if (!r.drafts.length) return setErr("Nenhuma linha tinha data e valor válidos. Verifique as colunas escolhidas.");
    setErr(null);
    setDrafts(r.drafts);
    setSkipped(r.skipped);
  };

  const commit = async () => {
    if (!drafts || !map || !accountId) return;
    setBusy(true);
    const rows = drafts.filter((d) => d.include).map(({ duplicate: _d, include: _i, suggested: _s, ...t }) => t);
    await saveMany("transaction", rows);
    const preset = db.importPreset.find((p) => p.accountId === accountId);
    await save("importPreset", { id: preset?.id ?? uid(), accountId, mapping: map });
    setBusy(false);
    onClose();
  };

  const counts = useMemo(() => {
    if (!drafts) return null;
    const inc = drafts.filter((d) => d.include);
    return { n: inc.length, dup: drafts.filter((d) => d.duplicate).length, uncategorised: inc.filter((d) => !d.categoryId).length, total: inc.reduce((s, d) => s + d.amount, 0) };
  }, [drafts]);

  const col = (label: string, key: keyof ColumnMapping, optional = false) => (
    <Field label={label}>
      {(id) => (
        <select id={id} className="input" value={(map?.[key] as string) ?? ""} onChange={(e) => setMap({ ...map!, [key]: e.target.value || null })}>
          {optional && <option value="">—</option>}
          {file!.headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  const update = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds!.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar extrato"
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          {!drafts ? (
            <button className="btn-primary" disabled={!file || !accountId} onClick={preview}>
              Ver movimentos
            </button>
          ) : (
            <button className="btn-primary" disabled={busy || !counts?.n} onClick={commit}>
              {busy ? "A importar…" : `Importar ${counts?.n ?? 0} movimentos`}
            </button>
          )}
        </>
      }
    >
      {db.account.length === 0 ? (
        <Notice tone="warn">Primeiro adicione as vossas contas em Ajustes → Bancos e cartões.</Notice>
      ) : !drafts ? (
        <div className="grid gap-4">
          <p className="text-muted text-[13px]">
            Exporte os movimentos do homebanking em <b>CSV</b> (a maioria dos bancos portugueses e a Revolut). Movimentos já importados são ignorados, por isso pode importar o mesmo período duas vezes sem duplicar.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Conta">{(id) => <AccountSelect id={id} value={accountId} onChange={setAccountId} allowEmpty={false} />}</Field>
            <Field label="Ficheiro CSV">
              {(id) => <input id={id} type="file" accept=".csv,.txt,text/csv" className="input py-1.5 h-auto file:mr-3 file:rounded-md file:border-0 file:bg-sunk file:px-2 file:py-1 file:text-[12.5px]" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />}
            </Field>
          </div>
          {file && map && (
            <div className="grid gap-3 rounded-xl bg-sunk p-4">
              <p className="text-[13px]">
                <b>{fileName}</b>: {file.rows.length} linhas. Confirme as colunas:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {col("Data", "date")}
                {col("Descrição", "description")}
                {col("Valor (com sinal)", "amount", true)}
                {col("Débito", "debit", true)}
                {col("Crédito", "credit", true)}
                <Field label="Formato da data">
                  {(id) => (
                    <select id={id} className="input" value={map.dateFormat} onChange={(e) => setMap({ ...map, dateFormat: e.target.value as ColumnMapping["dateFormat"] })}>
                      <option value="dmy">dia-mês-ano</option>
                      <option value="ymd">ano-mês-dia</option>
                      <option value="mdy">mês-dia-ano</option>
                    </select>
                  )}
                </Field>
              </div>
              <p className="text-[12px] text-muted">Use "Valor" quando o banco tem uma coluna com sinal (−45,20), ou "Débito" e "Crédito" quando são separadas. Estas escolhas ficam guardadas para esta conta.</p>
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr>{file.headers.map((h) => <th key={h} className="text-left px-2 py-1.5 text-muted font-semibold whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {file.rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="px-2 py-1.5 whitespace-nowrap">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {err && <Notice tone="bad">{err}</Notice>}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            <span className="chip bg-brand-soft text-brand">{counts!.n} a importar</span>
            {counts!.dup > 0 && <span className="chip bg-sunk text-muted">{counts!.dup} já existiam</span>}
            {skipped > 0 && <span className="chip bg-sunk text-muted">{skipped} ignoradas (pendentes ou sem valor)</span>}
            {counts!.uncategorised > 0 && <span className="chip bg-warn/15 text-warn">{counts!.uncategorised} sem categoria</span>}
            <span className="chip bg-sunk">Saldo do ficheiro: <Money value={counts!.total} /></span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="bg-sunk text-muted text-[12px]">
                <tr>
                  <th className="w-8 px-2 py-2" />
                  <th className="text-left px-2">Data</th>
                  <th className="text-left px-2">Descrição</th>
                  <th className="text-right px-2">Valor</th>
                  <th className="text-left px-2 w-[200px]">Categoria</th>
                  <th className="text-left px-2 w-[150px]">De quem</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => (
                  <tr key={d.id} className={cx("border-t border-line", !d.include && "opacity-45")}>
                    <td className="px-2 text-center">
                      <input type="checkbox" aria-label="Importar esta linha" checked={d.include} onChange={(e) => update(i, { include: e.target.checked })} />
                    </td>
                    <td className="px-2 whitespace-nowrap tnum">{fmtDate(d.date)}</td>
                    <td className="px-2 max-w-[260px] truncate" title={d.description}>
                      {d.description} {d.duplicate && <span className="chip bg-sunk text-muted ml-1">já existe</span>}
                    </td>
                    <td className={cx("px-2 text-right font-semibold", d.amount > 0 && "text-good")}>
                      <Money value={d.amount} signed />
                    </td>
                    <td className="px-1 py-1">
                      <CategorySelect value={d.categoryId} onChange={(v) => update(i, { categoryId: v, suggested: null })} />
                    </td>
                    <td className="px-1 py-1">
                      <WhoSelect value={d.memberId} onChange={(v) => update(i, { memberId: v })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-quiet self-start" onClick={() => setDrafts(null)}>
            ← Mudar colunas
          </button>
        </div>
      )}
    </Modal>
  );
}
