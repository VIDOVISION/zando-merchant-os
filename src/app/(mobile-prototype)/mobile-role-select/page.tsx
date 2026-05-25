"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
  TopHeader,
} from "@/components/mobile-prototype/components";
import {
  DEFAULT_ZANDO_ROLE,
  getStoredZandoRole,
  getZandoRoleRedirectPath,
  saveZandoRole,
  type ZandoRole,
} from "@/lib/zando-role";

const roleOptions: Array<{
  role: ZandoRole;
  label: string;
  helper: string;
}> = [
  {
    role: "supplier",
    label: "Supplier / Grossiste",
    helper: "Manage orders, stock, deliveries and money.",
  },
  {
    role: "shop",
    label: "Shop / Boutique",
    helper: "Record sales and order from suppliers.",
  },
  {
    role: "driver",
    label: "Driver",
    helper: "Handle pickups and deliveries.",
  },
  {
    role: "admin",
    label: "Admin",
    helper: "Review the Zando operation.",
  },
];

export default function MobileRoleSelectPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<ZandoRole>(DEFAULT_ZANDO_ROLE);

  useEffect(() => {
    setSelectedRole(getStoredZandoRole());
  }, []);

  function handleRoleSelect(role: ZandoRole) {
    saveZandoRole(role);
    setSelectedRole(role);
    router.push(getZandoRoleRedirectPath(role));
  }

  return (
    <MobilePageShell active="dashboard" hideBottomNav>
      <TopHeader />

      <main className="mt-10 space-y-4 pb-32">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-400">
            Zando
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">Choose Zando role</h1>
        </section>

        <SectionCard className="p-4">
          <div className="grid gap-3">
            {roleOptions.map((option) => {
              const selected = option.role === selectedRole;

              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => handleRoleSelect(option.role)}
                  className={`flex min-h-16 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-blue-400/30 bg-blue-600/15"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-base font-black text-white">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-400">
                      {option.helper}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                </button>
              );
            })}
          </div>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
