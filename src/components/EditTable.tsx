// Spreadsheet-like editor for any list in the store: edit in place, saves on change.
import { useEffect, useState, type ReactNode } from "react";
import { Trash2, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Kind, Tables } from "@/lib/types";
import { MONTHS_SHORT } from "@/lib/format";
import { NumberInput, cx } from "./ui";

export type Col<T> = {
  key: keyof T & string;
  label: string;
  type: "text" | "number" | "select" | "bool" | "day" | "month" | "color";
  options?: [string, string][];
  width?: string;
  placeholder?: string;
  /** Empty select option label; select stores null when chosen. */
  emptyLabel?: string;
  render?: (row: T) => ReactNode;
};

function TextCell({ value, onCommit, placeholder, label }: { value: string; onCommit: (v: string) => void; placeholder?: string; label: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      aria-label={label}
      className="input border-transparent bg-transparent hover:bg-sunk focus:bg-surface"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

function NumCell({ value, onCommit, placeholder, label }: { value: number | null; onCommit: (v: number | null) => void; placeholder?: string; label: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div onBlur={() => v !== value && onCommit(v)} aria-label={label}>
      <NumberInput value={v} onChange={setV} allowEmpty placeholder={placeholder} className="border-transparent bg-transparent hover:bg-sunk focus:bg-surface text-right" />
    </div>
  );
}

export function EditTable<K extends Kind>({
  kind, rows, cols, make, addLabel = "Adicionar", empty, minWidth = 640, canDelete = () => true,
}: {
  kind: K;
  rows: Tables[K][];
  cols: Col<Tables[K]>[];
  make: () => Tables[K];
  addLabel?: string;
  empty?: string;
  minWidth?: number;
  canDelete?: (r: Tables[K]) => boolean;
}) {
  const { save, remove } = useStore();
  const [confirm, setConfirm] = useState<string | null>(null);
  const set = (row: Tables[K], key: string, value: unknown) => save(kind, { ...row, [key]: value } as Tables[K]);

  const cell = (row: Tables[K], c: Col<Tables[K]>) => {
    const v = (row as unknown as Record<string, unknown>)[c.key];
    if (c.render) return c.render(row);
    switch (c.type) {
      case "text":
        return <TextCell label={c.label} value={(v as string) ?? ""} placeholder={c.placeholder} onCommit={(x) => set(row, c.key, x)} />;
      case "number":
        return <NumCell label={c.label} value={(v as number | null) ?? null} placeholder={c.placeholder} onCommit={(x) => set(row, c.key, x)} />;
      case "day":
        return (
          <select aria-label={c.label} className="input border-transparent bg-transparent hover:bg-sunk tnum" value={(v as number | null) ?? ""} onChange={(e) => set(row, c.key, e.target.value ? Number(e.target.value) : null)}>
            <option value="">—</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        );
      case "month":
        return (
          <select aria-label={c.label} className="input border-transparent bg-transparent hover:bg-sunk" value={(v as number | null) ?? ""} onChange={(e) => set(row, c.key, e.target.value ? Number(e.target.value) : null)}>
            <option value="">—</option>
            {MONTHS_SHORT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        );
      case "select":
        return (
          <select aria-label={c.label} className="input border-transparent bg-transparent hover:bg-sunk" value={(v as string | null) ?? ""} onChange={(e) => set(row, c.key, e.target.value || null)}>
            {c.emptyLabel !== undefined && <option value="">{c.emptyLabel}</option>}
            {c.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        );
      case "bool":
        return (
          <div className="flex justify-center">
            <input type="checkbox" aria-label={c.label} className="h-4 w-4 accent-[rgb(var(--brand))]" checked={!!v} onChange={(e) => set(row, c.key, e.target.checked)} />
          </div>
        );
      case "color":
        return <input type="color" aria-label={c.label} className="h-8 w-10 rounded-md border border-line bg-surface p-0.5" value={(v as string) || "#243e89"} onChange={(e) => set(row, c.key, e.target.value)} />;
    }
  };

  return (
    <div className="grid gap-3">
      {rows.length === 0 && empty ? (
        <p className="text-muted text-[13px] rounded-xl border border-dashed border-line px-4 py-5 text-center">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-[13.5px]" style={{ minWidth }}>
            <thead className="bg-sunk text-muted text-[12px]">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={cx("px-2 py-2 font-semibold whitespace-nowrap", c.type === "number" ? "text-right" : c.type === "bool" ? "text-center" : "text-left")} style={{ width: c.width }}>
                    {c.label}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const id = (r as { id: string }).id;
                return (
                  <tr key={id} className="border-t border-line">
                    {cols.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        {cell(r, c)}
                      </td>
                    ))}
                    <td className="px-1 text-center">
                      {canDelete(r) &&
                        (confirm === id ? (
                          <button className="btn-danger h-8 px-2 text-[12px]" onClick={() => { remove(kind, id); setConfirm(null); }} onBlur={() => setConfirm(null)}>
                            Apagar?
                          </button>
                        ) : (
                          <button className="btn-quiet h-8 w-8 px-0" aria-label="Apagar linha" onClick={() => setConfirm(id)}>
                            <Trash2 size={15} />
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button className="btn-ghost self-start border-dashed" onClick={() => save(kind, make())}>
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  );
}
