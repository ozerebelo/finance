import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { cloudConfigured, hasLocalData, localBackend, supabase, supabaseBackend } from "@/lib/backend";
import { StoreProvider, useStore } from "@/lib/store";
import type { DB } from "@/lib/types";
import { Layout } from "@/components/Layout";
import { Welcome } from "@/pages/Welcome";
import { Login } from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CashFlow from "@/pages/CashFlow";
import Accounts from "@/pages/Accounts";
import House from "@/pages/House";
import Reserve from "@/pages/Reserve";
import Budget from "@/pages/Budget";
import Review from "@/pages/Review";
import Year from "@/pages/Year";
import Income from "@/pages/settings/Income";
import Bills from "@/pages/settings/Bills";
import Banks from "@/pages/settings/Banks";
import Annual from "@/pages/settings/Annual";
import Categories from "@/pages/settings/Categories";
import Preferences from "@/pages/settings/Preferences";

function Loading({ text = "A carregar…" }: { text?: string }) {
  return <div className="min-h-screen grid place-items-center text-muted">{text}</div>;
}

function AppRoutes() {
  const { ready } = useStore();
  if (!ready) return <Loading />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fluxo" element={<CashFlow />} />
        <Route path="/cartoes" element={<Accounts />} />
        <Route path="/casa" element={<House />} />
        <Route path="/reserva" element={<Reserve />} />
        <Route path="/categorias" element={<Budget />} />
        <Route path="/revisao" element={<Review />} />
        <Route path="/anual" element={<Year />} />
        <Route path="/ajustes/renda" element={<Income />} />
        <Route path="/ajustes/contas-casa" element={<Bills />} />
        <Route path="/ajustes/bancos" element={<Banks />} />
        <Route path="/ajustes/anuais" element={<Annual />} />
        <Route path="/ajustes/categorias" element={<Categories />} />
        <Route path="/ajustes/preferencias" element={<Preferences />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function LocalRoot() {
  const backend = useMemo(() => localBackend(), []);
  const [has, setHas] = useState(hasLocalData());
  if (!has)
    return (
      <Welcome
        onDone={async (db: DB) => {
          await backend.replaceAll(db);
          setHas(true);
        }}
      />
    );
  return (
    <StoreProvider backend={backend}>
      <AppRoutes />
    </StoreProvider>
  );
}

function CloudRoot() {
  const sb = supabase!;
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [household, setHousehold] = useState<string | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!session) return setHousehold(undefined);
    sb.rpc("my_household").then(({ data, error }) => {
      if (error) setErr(error.message);
      setHousehold((data as string | null) ?? null);
    });
  }, [session, sb]);

  const signOut = useCallback(() => { sb.auth.signOut(); }, [sb]);
  const backend = useMemo(() => (household ? supabaseBackend(household) : null), [household]);

  if (session === undefined) return <Loading />;
  if (!session) return <Login />;
  if (err) return <Loading text={"Erro: " + err + ". Confirme que correu supabase/schema.sql."} />;
  if (household === undefined) return <Loading />;
  if (!household || !backend) {
    let localData: string | null = null;
    try { localData = localStorage.getItem("casa-a-dois:db:v1"); } catch { /* ignore */ }
    return (
      <Welcome
        cloud
        localData={localData}
        onDone={async (db) => {
          const { data, error } = await sb.rpc("create_household", { p_name: db.settings[0]?.householdName ?? "Casa a Dois" });
          if (error) throw new Error(error.message);
          // Link the logged-in user to the first person if no e-mail is set yet.
          const email = session.user.email ?? null;
          if (email && !db.member.some((m) => m.email)) db.member[0] = { ...db.member[0], email };
          await supabaseBackend(data as string).replaceAll(db);
          setHousehold(data as string);
        }}
      />
    );
  }
  return (
    <StoreProvider backend={backend} signOut={signOut} userEmail={session.user.email} householdId={household}>
      <AppRoutes />
    </StoreProvider>
  );
}

export default function App() {
  return <BrowserRouter>{cloudConfigured ? <CloudRoot /> : <LocalRoot />}</BrowserRouter>;
}
