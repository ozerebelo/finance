// Two interchangeable stores behind one interface:
//  - local: everything in this browser's localStorage (works with no setup)
//  - supabase: one `records` table, shared by both partners, with live updates
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emptyDB, KINDS, type DB, type Kind, type Tables } from "./types";

export interface Backend {
  mode: "local" | "supabase";
  load(): Promise<DB>;
  put<K extends Kind>(kind: K, row: Tables[K]): Promise<void>;
  putMany<K extends Kind>(kind: K, rows: Tables[K][]): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
  replaceAll(db: DB): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export const cloudConfigured = !!supabase;

// ---------- local ----------
const LS_KEY = "casa-a-dois:db:v1";

function readLocal(): DB | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return normalise(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function normalise(raw: Partial<DB>): DB {
  const db = emptyDB();
  for (const k of KINDS) if (Array.isArray(raw[k])) (db as Record<Kind, unknown[]>)[k] = raw[k] as unknown[];
  return db;
}

export function hasLocalData() {
  return readLocal() !== null;
}

export function localBackend(): Backend {
  let db = readLocal() ?? emptyDB();
  const write = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch {
      /* storage full or blocked: the in-memory copy still works for this visit */
    }
  };
  const listeners = new Set<() => void>();
  const onStorage = (e: StorageEvent) => {
    if (e.key === LS_KEY) {
      db = readLocal() ?? emptyDB();
      listeners.forEach((l) => l());
    }
  };
  return {
    mode: "local",
    async load() {
      db = readLocal() ?? db;
      return structuredClone(db);
    },
    async put(kind, row) {
      const list = db[kind] as { id: string }[];
      const i = list.findIndex((r) => r.id === row.id);
      if (i >= 0) list[i] = row;
      else list.push(row);
      write();
    },
    async putMany(kind, rows) {
      for (const r of rows) await this.put(kind, r);
    },
    async remove(kind, id) {
      (db as Record<Kind, { id: string }[]>)[kind] = (db[kind] as { id: string }[]).filter((r) => r.id !== id);
      write();
    },
    async replaceAll(next) {
      db = structuredClone(next);
      write();
    },
    subscribe(fn) {
      listeners.add(fn);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(fn);
        if (!listeners.size) window.removeEventListener("storage", onStorage);
      };
    },
  };
}

// ---------- supabase ----------
export function supabaseBackend(householdId: string): Backend {
  const sb = supabase!;
  const row = (kind: Kind, r: { id: string }) => ({ household_id: householdId, kind, id: r.id, data: r, updated_at: new Date().toISOString() });
  const check = (res: { error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message);
  };
  return {
    mode: "supabase",
    async load() {
      const db = emptyDB();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const res = await sb.from("records").select("kind,data").eq("household_id", householdId).range(from, from + pageSize - 1);
        check(res);
        for (const r of res.data ?? []) {
          const k = r.kind as Kind;
          if (KINDS.includes(k)) (db[k] as unknown[]).push(r.data);
        }
        if ((res.data?.length ?? 0) < pageSize) break;
      }
      return db;
    },
    async put(kind, r) {
      check(await sb.from("records").upsert(row(kind, r), { onConflict: "household_id,kind,id" }));
    },
    async putMany(kind, rows) {
      for (let i = 0; i < rows.length; i += 500) {
        check(await sb.from("records").upsert(rows.slice(i, i + 500).map((r) => row(kind, r)), { onConflict: "household_id,kind,id" }));
      }
    },
    async remove(kind, id) {
      check(await sb.from("records").delete().eq("household_id", householdId).eq("kind", kind).eq("id", id));
    },
    async replaceAll(next) {
      check(await sb.from("records").delete().eq("household_id", householdId));
      for (const k of KINDS) if (next[k].length) await this.putMany(k, next[k] as never[]);
    },
    subscribe(fn) {
      let t: ReturnType<typeof setTimeout> | undefined;
      const ch = sb
        .channel("records-" + householdId)
        .on("postgres_changes", { event: "*", schema: "public", table: "records", filter: `household_id=eq.${householdId}` }, () => {
          clearTimeout(t);
          t = setTimeout(fn, 400); // coalesce bursts (imports)
        })
        .subscribe();
      return () => {
        clearTimeout(t);
        sb.removeChannel(ch);
      };
    },
  };
}
