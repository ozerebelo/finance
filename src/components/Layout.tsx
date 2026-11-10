import { useMemo, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight, Bell, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, Home, LayoutGrid, LogOut, Menu, Monitor, Moon,
  PiggyBank, Plus, Receipt, Sun, Tags, Upload, Wallet, X, BarChart3, ClipboardList, Landmark, CalendarClock, SlidersHorizontal,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { addMonths, monthLabel, MONTHS, todayISO, yearOf, monthNum, pad } from "@/lib/format";
import { alerts, members, settingsOf } from "@/lib/calc";
import { Avatar, cx } from "./ui";
import { TransactionModal } from "./TransactionModal";
import { ImportModal } from "./ImportModal";

const MENU = [
  { to: "/", label: "Visão geral", icon: LayoutGrid },
  { to: "/fluxo", label: "Fluxo de caixa", icon: ArrowLeftRight },
  { to: "/cartoes", label: "Contas e cartões", icon: CreditCard },
  { to: "/casa", label: "Nossa casa", icon: Home },
  { to: "/reserva", label: "Nossa reserva", icon: PiggyBank },
  { to: "/categorias", label: "Orçamento", icon: Tags },
  { to: "/revisao", label: "Revisão do mês", icon: ClipboardList },
  { to: "/anual", label: "Relatório anual", icon: BarChart3 },
];
const SETTINGS = [
  { to: "/ajustes/renda", label: "Nossa renda", icon: Wallet },
  { to: "/ajustes/contas-casa", label: "Contas da casa", icon: Receipt },
  { to: "/ajustes/bancos", label: "Bancos e cartões", icon: Landmark },
  { to: "/ajustes/anuais", label: "Contas anuais", icon: CalendarClock },
  { to: "/ajustes/categorias", label: "Categorias e regras", icon: Tags },
  { to: "/ajustes/preferencias", label: "Preferências", icon: SlidersHorizontal },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { db, theme, setTheme, me, setMeId, mode, signOut, userEmail, saving, error } = useStore();
  const ms = members(db);
  const s = settingsOf(db);
  const link = ({ isActive }: { isActive: boolean }) =>
    cx("flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors", isActive ? "bg-sunk text-fg font-semibold" : "text-muted hover:text-fg hover:bg-sunk/60");
  return (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Menu principal">
      <div className="flex items-center gap-3 px-2 pb-4">
        <div className="flex -space-x-2">
          {ms.slice(0, 2).map((m) => (
            <Avatar key={m.id} name={m.name} tone={m.color} size={30} />
          ))}
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-[15px] leading-tight truncate">{s.householdName}</div>
          <div className="text-[12px] text-muted truncate">Finanças em casal</div>
        </div>
      </div>
      <p className="label px-3 pt-1 pb-1">Menu</p>
      {MENU.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.to === "/"} className={link} onClick={onNavigate}>
          <i.icon size={17} strokeWidth={2} /> {i.label}
        </NavLink>
      ))}
      <p className="label px-3 pt-4 pb-1">Ajustes</p>
      {SETTINGS.map((i) => (
        <NavLink key={i.to} to={i.to} className={link} onClick={onNavigate}>
          <i.icon size={17} strokeWidth={2} /> {i.label}
        </NavLink>
      ))}
      <div className="mt-auto pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-3">
          <span className="label">Tema</span>
          <div className="flex rounded-full bg-sunk p-0.5">
            {([["light", Sun], ["system", Monitor], ["dark", Moon]] as const).map(([t, I]) => (
              <button key={t} onClick={() => setTheme(t)} aria-label={t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Automático"} className={cx("grid h-7 w-7 place-items-center rounded-full", theme === t ? "bg-surface shadow-sm text-fg" : "text-muted")}>
                <I size={14} />
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line p-2.5">
          <div className="flex items-center gap-2.5">
            {me && <Avatar name={me.name} tone={me.color} size={30} />}
            <div className="min-w-0 flex-1">
              {mode === "local" ? (
                <select aria-label="Quem está a usar" className="w-full bg-transparent font-semibold text-[13.5px] focus:outline-none" value={me?.id ?? ""} onChange={(e) => setMeId(e.target.value)}>
                  {ms.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="font-semibold text-[13.5px] truncate">{me?.name ?? userEmail}</div>
              )}
              <div className={cx("text-[11.5px] flex items-center gap-1", error ? "text-bad" : mode === "local" ? "text-warn" : "text-good")}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {error ? "Erro ao guardar" : saving ? "A guardar…" : mode === "local" ? "Só neste navegador" : "Sincronizado"}
              </div>
            </div>
            {signOut && (
              <button className="btn-quiet h-8 w-8 px-0" onClick={signOut} aria-label="Sair">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function MonthPicker() {
  const { month, setMonth } = useStore();
  const [open, setOpen] = useState(false);
  const year = yearOf(month);
  return (
    <div className="flex items-center gap-1 min-w-0">
      <button className="btn-quiet h-9 w-9 px-0" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </button>
      <button className="btn-quiet h-9 w-9 px-0" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mês seguinte">
        <ChevronRight size={18} />
      </button>
      <div className="relative min-w-0">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-lg px-1.5 font-display text-[19px] sm:text-[26px] font-bold tracking-tight truncate max-w-full" aria-expanded={open}>
          {MONTHS[monthNum(month) - 1]} <span className="text-muted font-semibold">{year}</span>
          <ChevronDown size={18} className="text-muted" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-40 mt-2 w-72 card p-3" onMouseLeave={() => setOpen(false)}>
            <div className="flex items-center justify-between mb-2">
              <button className="btn-quiet h-8 w-8 px-0" onClick={() => setMonth(`${year - 1}-${pad(monthNum(month))}`)} aria-label="Ano anterior">
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold">{year}</span>
              <button className="btn-quiet h-8 w-8 px-0" onClick={() => setMonth(`${year + 1}-${pad(monthNum(month))}`)} aria-label="Ano seguinte">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((n, i) => {
                const k = `${year}-${pad(i + 1)}`;
                return (
                  <button key={k} onClick={() => { setMonth(k); setOpen(false); }} className={cx("rounded-lg py-2 text-[13px] font-medium", k === month ? "bg-brand text-on-brand" : "hover:bg-sunk")}>
                    {n.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <button className="btn-quiet w-full mt-2" onClick={() => { setMonth(todayISO().slice(0, 7)); setOpen(false); }}>
              Ir para hoje
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Bell_() {
  const { db } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const list = useMemo(() => alerts(db, todayISO()), [db]);
  return (
    <div className="relative">
      <button className="btn-ghost h-10 w-10 px-0 relative" onClick={() => setOpen(!open)} aria-label={`Avisos (${list.length})`} aria-expanded={open}>
        <Bell size={18} />
        {list.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-bad text-white text-[10.5px] font-bold grid place-items-center px-1">{list.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(340px,calc(100vw-32px))] card p-2" onMouseLeave={() => setOpen(false)}>
          <p className="px-2 py-1.5 font-semibold">Avisos</p>
          {list.length === 0 && <p className="px-2 pb-3 text-muted text-[13px]">Está tudo em dia.</p>}
          {list.map((a) => (
            <button key={a.id} onClick={() => { nav(a.href); setOpen(false); }} className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-sunk">
              <span className={cx("mt-1.5 h-2 w-2 rounded-full shrink-0", a.level === "bad" ? "bg-bad" : a.level === "warn" ? "bg-warn" : "bg-brand")} />
              {a.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddButton() {
  const [menu, setMenu] = useState(false);
  const [tx, setTx] = useState<null | "expense" | "income" | "transfer">(null);
  const [imp, setImp] = useState(false);
  return (
    <div className="relative flex">
      <button className="btn-primary h-10 rounded-r-none pl-3.5 pr-3" onClick={() => setTx("expense")}>
        <Plus size={17} /> <span className="hidden sm:inline">Adicionar</span>
      </button>
      <button className="btn-primary h-10 rounded-l-none border-l border-on-brand/20 px-2" onClick={() => setMenu(!menu)} aria-label="Mais opções" aria-expanded={menu}>
        <ChevronDown size={16} />
      </button>
      {menu && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 card p-1.5" onMouseLeave={() => setMenu(false)}>
          {([["expense", "Despesa"], ["income", "Receita"], ["transfer", "Transferência"]] as const).map(([k, l]) => (
            <button key={k} className="w-full rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-sunk" onClick={() => { setTx(k); setMenu(false); }}>
              {l}
            </button>
          ))}
          <button className="w-full rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-sunk flex items-center gap-2" onClick={() => { setImp(true); setMenu(false); }}>
            <Upload size={15} /> Importar extrato
          </button>
        </div>
      )}
      {tx && <TransactionModal open kind={tx} onClose={() => setTx(null)} />}
      {imp && <ImportModal open onClose={() => setImp(false)} />}
    </div>
  );
}

function HideToggle() {
  const { hidden, setHidden } = useStore();
  return (
    <button className="btn-ghost h-10 w-10 px-0" onClick={() => setHidden(!hidden)} aria-label={hidden ? "Mostrar valores" : "Esconder valores"} title={hidden ? "Mostrar valores" : "Esconder valores"}>
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const { error, month } = useStore();
  return (
    <div className="mx-auto flex max-w-[1500px] gap-4 lg:gap-5 p-0 lg:p-5">
      <aside className="hidden lg:block w-[248px] shrink-0">
        <div className="card sticky top-5 h-[calc(100vh-40px)] overflow-y-auto">
          <Sidebar />
        </div>
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/40" onClick={() => setDrawer(false)}>
          <div className="h-full w-[280px] max-w-[85vw] bg-surface overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="flex justify-end p-2">
              <button className="btn-quiet h-9 w-9 px-0" onClick={() => setDrawer(false)} aria-label="Fechar menu">
                <X size={18} />
              </button>
            </div>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1 px-4 lg:px-0 pb-10" style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
        <header className="card sticky top-0 lg:top-5 z-30 -mx-4 lg:mx-0 rounded-none lg:rounded-card border-x-0 lg:border-x flex items-center gap-2 px-3 sm:px-4 py-2.5 mb-4 lg:mb-5" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
          <button className="btn-quiet h-9 w-9 px-0 lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1" key={month}>
            <MonthPicker />
          </div>
          <HideToggle />
          <Bell_ />
          <AddButton />
        </header>
        {error && <div className="mb-4 rounded-xl bg-bad/10 text-bad px-4 py-3 text-[13px] font-medium">{error}</div>}
        <main>{children}</main>
      </div>
    </div>
  );
}

export const monthTitle = monthLabel;
