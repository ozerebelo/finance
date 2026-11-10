import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtEUR, splitAmount } from "@/lib/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/** Amount in euros; respects "hide values". */
export function Money({ value, className, signed, zeroDash }: { value: number; className?: string; signed?: boolean; zeroDash?: boolean }) {
  const { hidden } = useStore();
  if (hidden) return <span className={cx("tnum", className)}>••• €</span>;
  if (zeroDash && Math.abs(value) < 0.005) return <span className={cx("tnum text-muted", className)}>—</span>;
  const s = fmtEUR(value);
  return <span className={cx("tnum whitespace-nowrap", className)}>{signed && value > 0 ? "+" + s : s}</span>;
}

/** The large headline number: "5 304" big, ",28 €" small. */
export function BigMoney({ value, size = "lg", className }: { value: number; size?: "xl" | "lg" | "md"; className?: string }) {
  const { hidden } = useStore();
  const { neg, int, cents } = splitAmount(value);
  const big = size === "xl" ? "text-[44px] sm:text-[56px]" : size === "lg" ? "text-[32px] sm:text-[36px]" : "text-[24px]";
  const small = size === "xl" ? "text-[22px] sm:text-[26px]" : size === "lg" ? "text-[16px]" : "text-[13px]";
  return (
    <span className={cx("font-display font-extrabold tracking-tight tnum whitespace-nowrap leading-none", className)}>
      <span className={big}>{hidden ? "•••" : (neg ? "−" : "") + int}</span>
      <span className={cx(small, "text-muted font-semibold")}>{hidden ? "" : "," + cents} €</span>
    </span>
  );
}

export function Card({ children, className, title, extra, art }: { children: ReactNode; className?: string; title?: ReactNode; extra?: ReactNode; art?: ReactNode }) {
  return (
    <section className={cx("card card-pad relative", className)}>
      {(title || extra) && (
        <header className="flex items-start justify-between gap-3 mb-1">
          <h2 className="card-title">{title}</h2>
          {extra}
        </header>
      )}
      {art && <div className="pointer-events-none absolute right-4 top-4 sm:right-6 sm:top-5 hidden sm:block">{art}</div>}
      {children}
    </section>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="font-display text-[24px] font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-muted text-[13.5px] mt-1 max-w-[70ch]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="text-muted text-[13px] mt-1 max-w-[52ch] mx-auto">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Bar({ value, max = 1, tone = "brand", marker, className }: { value: number; max?: number; tone?: string; marker?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100;
  return (
    <div className={cx("relative h-2.5 rounded-full bg-sunk", className)}>
      <div className={cx("h-full rounded-full transition-all", `bg-${tone}`)} style={{ width: pct + "%" }} />
      {marker != null && <div className="absolute -top-1.5 -bottom-1.5 w-[3px] rounded bg-fg" style={{ left: `calc(${Math.min(100, (marker / max) * 100)}% - 1.5px)` }} />}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: [T, string][]; className?: string }) {
  return (
    <div className={cx("inline-flex rounded-xl bg-sunk p-1 gap-1", className)} role="tablist">
      {options.map(([v, l]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={cx("flex-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors", value === v ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx("bg-surface w-full rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="font-semibold text-[16px]">{title}</h2>
          <button className="btn-quiet h-8 w-8 px-0" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-line flex flex-wrap justify-end gap-2" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: (id: string) => ReactNode; hint?: string; className?: string }) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1 min-w-0", className)}>
      <label htmlFor={id} className="text-[12.5px] font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </div>
  );
}

/** Parses "1.234,56", "1234.56", "-12" etc. Returns null for empty input. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s|€/g, "");
  if (!t) return null;
  let norm = t;
  if (t.includes(",") && t.includes(".")) norm = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (t.includes(",")) norm = t.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** Number input that accepts Portuguese decimals and only commits valid numbers. */
export function NumberInput({ value, onChange, id, placeholder, className, allowEmpty }: { value: number | null; onChange: (n: number | null) => void; id?: string; placeholder?: string; className?: string; allowEmpty?: boolean }) {
  const [text, setText] = useState(value == null ? "" : String(value).replace(".", ","));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setText(value == null ? "" : String(value).replace(".", ","));
      last.current = value;
    }
  }, [value]);
  return (
    <input
      id={id}
      inputMode="decimal"
      className={cx("input tnum", className)}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNum(e.target.value);
        if (n !== null || (allowEmpty && e.target.value.trim() === "")) {
          last.current = n;
          onChange(n);
        }
      }}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[13.5px]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-brand" : "bg-line")}
      >
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}

export function Avatar({ name, tone, size = 28 }: { name: string; tone: "p1" | "p2" | "joint"; size?: number }) {
  const bg = tone === "p1" ? "bg-p1" : tone === "p2" ? "bg-p2" : "bg-brand";
  return (
    <span className={cx("inline-grid place-items-center rounded-full text-white font-semibold ring-2 ring-surface shrink-0", bg)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {tone === "joint" ? "∞" : (name.trim()[0] || "?").toUpperCase()}
    </span>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad"; children: ReactNode }) {
  const c = tone === "warn" ? "bg-warn/10 text-warn" : tone === "bad" ? "bg-bad/10 text-bad" : "bg-brand-soft text-brand";
  return <div className={cx("rounded-xl px-3.5 py-2.5 text-[13px] font-medium", c)}>{children}</div>;
}
