import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Backend } from "./backend";
import { emptyDB, type DB, type Kind, type Member, type Tables } from "./types";
import { currentMonth } from "./format";
import { members, settingsOf } from "./calc";

type Theme = "light" | "dark" | "system";

interface Store {
  db: DB;
  mode: Backend["mode"];
  ready: boolean;
  error: string | null;
  saving: boolean;
  save<K extends Kind>(kind: K, row: Tables[K]): Promise<void>;
  saveMany<K extends Kind>(kind: K, rows: Tables[K][]): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
  replaceAll(db: DB): Promise<void>;
  month: string;
  setMonth(m: string): void;
  hidden: boolean;
  setHidden(v: boolean): void;
  theme: Theme;
  setTheme(t: Theme): void;
  /** The person using the app on this device. */
  me: Member | null;
  setMeId(id: string): void;
  signOut?: () => void;
  userEmail?: string | null;
  householdId?: string | null;
}

const Ctx = createContext<Store | null>(null);

const pref = {
  get(k: string) {
    try {
      return localStorage.getItem("casa-a-dois:" + k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem("casa-a-dois:" + k, v);
    } catch {
      /* ignore */
    }
  },
};

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
function mix(rgb: readonly number[], to: number, t: number) {
  return rgb.map((c) => Math.round(c + (to - c) * t)).join(" ");
}

export function StoreProvider({ backend, children, signOut, userEmail, householdId }: { backend: Backend; children: ReactNode; signOut?: () => void; userEmail?: string | null; householdId?: string | null }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [month, setMonth] = useState(currentMonth());
  const [hidden, setHiddenState] = useState(pref.get("hidden") === "1");
  const [theme, setThemeState] = useState<Theme>((pref.get("theme") as Theme) || "system");
  const [meId, setMeIdState] = useState<string | null>(pref.get("me"));
  const dbRef = useRef(db);
  dbRef.current = db;

  const reload = useCallback(async () => {
    try {
      setDb(await backend.load());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, [backend]);

  useEffect(() => {
    reload();
    return backend.subscribe(reload);
  }, [backend, reload]);

  const run = useCallback(
    async (optimistic: (d: DB) => DB, op: () => Promise<void>) => {
      const before = dbRef.current;
      setDb(optimistic(before));
      setPending((n) => n + 1);
      try {
        await op();
        setError(null);
      } catch (e) {
        setDb(before);
        setError("Não foi possível guardar: " + (e as Error).message);
      } finally {
        setPending((n) => n - 1);
      }
    },
    [],
  );

  const upsertIn = <K extends Kind>(d: DB, kind: K, rows: Tables[K][]): DB => {
    const list = [...(d[kind] as Tables[K][])];
    for (const r of rows) {
      const i = list.findIndex((x) => (x as { id: string }).id === (r as { id: string }).id);
      if (i >= 0) list[i] = r;
      else list.push(r);
    }
    return { ...d, [kind]: list };
  };

  const value = useMemo<Store>(() => {
    const ms = members(db);
    const byEmail = userEmail ? ms.find((m) => m.email && m.email.toLowerCase() === userEmail.toLowerCase()) : undefined;
    const me = byEmail ?? ms.find((m) => m.id === meId) ?? ms[0] ?? null;
    return {
      db,
      mode: backend.mode,
      ready,
      error,
      saving: pending > 0,
      save: (kind, row) => run((d) => upsertIn(d, kind, [row]), () => backend.put(kind, row)),
      saveMany: (kind, rows) => run((d) => upsertIn(d, kind, rows), () => backend.putMany(kind, rows)),
      remove: (kind, id) => run((d) => ({ ...d, [kind]: (d[kind] as { id: string }[]).filter((r) => r.id !== id) }), () => backend.remove(kind, id)),
      replaceAll: (next) => run(() => next, () => backend.replaceAll(next)),
      month,
      setMonth,
      hidden,
      setHidden: (v) => {
        setHiddenState(v);
        pref.set("hidden", v ? "1" : "0");
      },
      theme,
      setTheme: (t) => {
        setThemeState(t);
        pref.set("theme", t);
      },
      me,
      setMeId: (id) => {
        setMeIdState(id);
        pref.set("me", id);
      },
      signOut,
      userEmail,
      householdId,
    };
  }, [db, backend, ready, error, pending, run, month, hidden, theme, meId, signOut, userEmail, householdId]);

  // Theme + brand colour on <html>.
  const brand = settingsOf(db).brandColor;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    const rgb = hexToRgb(brand);
    if (rgb) {
      root.style.setProperty("--brand-light", rgb.join(" "));
      root.style.setProperty("--brand-dark", mix(rgb, 255, 0.38));
      root.style.setProperty("--brand-soft-light", mix(rgb, 255, 0.88));
      root.style.setProperty("--brand-soft-dark", mix(rgb, 20, 0.62));
    }
  }, [theme, brand]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
