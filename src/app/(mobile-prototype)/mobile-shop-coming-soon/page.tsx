import Link from "next/link";

import {
  MobilePageShell,
  SectionCard,
  TopHeader,
} from "@/components/mobile-prototype/components";

export default function MobileShopComingSoonPage() {
  return (
    <MobilePageShell active="dashboard" hideBottomNav>
      <TopHeader />

      <main className="mt-10 space-y-4 pb-32">
        <SectionCard className="p-5">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-400">
            Shop / Boutique
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Shop app coming soon
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-300">
            This will allow boutiques and bars to place orders from suppliers.
          </p>
          <Link
            href="/mobile-role-select"
            className="mt-6 flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
          >
            Back to role select
          </Link>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
