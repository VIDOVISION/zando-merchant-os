import { MobilePageShell, SectionCard, TopHeader } from "@/components/mobile-prototype/components";

export default function MobileMenuPage() {
  return (
    <MobilePageShell active="menu">
      <TopHeader />

      <main className="mt-10 space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-400">More</p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white">Menu</h1>
          <p className="mt-2 text-base leading-7 text-slate-300">
            Prototype placeholder for secondary merchant actions.
          </p>
        </div>

        <SectionCard className="p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Coming next</p>
          <p className="mt-3 text-lg font-bold text-white">Settings, profile and support</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This keeps the bottom nav complete without changing the existing production settings page.
          </p>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
