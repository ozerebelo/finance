import { AccountsCard, BillsCard, HousingCard, ReserveStrip, SaldoCard, SplitCard } from "@/components/widgets";

export default function Dashboard() {
  return (
    <>
    <h1 className="sr-only">Visão geral</h1>
    <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)] items-start">
      <SaldoCard className="xl:col-span-2" />
      <BillsCard className="xl:row-span-2" />
      <SplitCard />
      <AccountsCard />
      <HousingCard className="xl:col-start-3" />
      <ReserveStrip className="xl:col-span-2 xl:row-start-3 xl:col-start-1" />
    </div>
    </>
  );
}
