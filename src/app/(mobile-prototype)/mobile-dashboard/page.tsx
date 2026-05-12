import { Box, ChevronRight, DollarSign } from "lucide-react";
import Link from "next/link";

import {
  MobilePageShell,
  ProductListItem,
  SectionCard,
  TopHeader,
} from "@/components/mobile-prototype/components";
import {
  dashboardStats,
  lowStockAlerts,
  topProducts,
} from "@/components/mobile-prototype/mock-data";

const todaysTasks = [
  {
    title: "Confirm orders",
    value: "3",
    action: "Review Orders",
    href: "/mobile-orders",
    tone: "orange",
  },
  {
    title: "Prepare pickups",
    value: "2",
    action: "Prepare Pickup",
    href: "/mobile-deliveries",
    tone: "blue",
  },
  {
    title: "Restock products",
    value: "5",
    action: "Restock Items",
    href: "/mobile-inventory",
    tone: "red",
  },
  {
    title: "Collect cash",
    value: "$186.50",
    action: "View Payments",
    href: "/mobile-finances",
    tone: "green",
  },
];

const taskToneStyles: Record<
  (typeof todaysTasks)[number]["tone"],
  { text: string; bg: string; border: string }
> = {
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-400/20",
  },
  green: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-400/20",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-400/20",
  },
  red: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-400/20",
  },
};

const homeStats = dashboardStats.map((stat) => ({
  label: stat.label,
  value: stat.value,
  tone:
    stat.tone === "green"
      ? "text-emerald-400"
      : stat.tone === "orange"
        ? "text-orange-400"
        : "text-blue-400",
}));

const lowStockPreview = lowStockAlerts.filter((product) =>
  ["Rice 5kg", "Sugar 2kg"].includes(product.name),
);

function CompactSalesSummary() {
  const bars = [28, 36, 32, 48, 42, 66, 52];

  return (
    <SectionCard className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Sales Summary</h2>
          <p className="mt-1 text-sm text-slate-400">This week</p>
        </div>
        <p className="text-lg font-black text-emerald-400">$425K</p>
      </div>
      <div className="mt-4 flex h-24 items-end gap-2">
        {bars.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-xl bg-blue-600/80"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-slate-500">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>
    </SectionCard>
  );
}

export default function MobileDashboardPage() {
  return (
    <MobilePageShell active="dashboard">
      <TopHeader />

      <main className="mt-8 space-y-4 pb-40">
        <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20">
          <p className="text-2xl font-bold leading-tight text-white">
            Hi, Patrice&apos;s Shop!
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Your weekly performance overview.
          </p>

          <div className="mt-4 grid grid-cols-[1.25fr_0.75fr] gap-3">
            <Link
              href="/mobile-orders"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
            >
              + Add Sale
            </Link>
            <Link
              href="/mobile-orders"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200"
            >
              New Order
            </Link>
          </div>
        </section>

        <SectionCard className="p-4">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-white">Today&apos;s Tasks</h2>
            <p className="mt-1 text-sm text-slate-400">Priority actions for today.</p>
          </div>
          <div className="space-y-2">
            {todaysTasks.map((task) => {
              const tone = taskToneStyles[task.tone];
              return (
                <Link
                  key={task.title}
                  href={task.href}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-white/[0.025] px-3 py-2.5 ${tone.border}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 min-w-9 items-center justify-center rounded-xl ${tone.bg}`}>
                      <span className={`text-sm font-black ${tone.text}`}>{task.value}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{task.title}</p>
                      <p className={`mt-0.5 text-xs font-semibold ${tone.text}`}>{task.action}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <section className="grid grid-cols-3 gap-2">
          {homeStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
            >
              <p className="min-h-8 text-[11px] leading-4 text-slate-400">{stat.label}</p>
              <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </section>

        <SectionCard className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Money Today</h2>
              <p className="text-sm text-slate-400">Today&apos;s money situation</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-500">Available</p>
              <p className="mt-1 text-sm font-black text-emerald-400">$2,450</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-500">Pending</p>
              <p className="mt-1 text-sm font-black text-orange-400">$186.50</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-500">Today</p>
              <p className="mt-1 text-sm font-black text-blue-400">$425</p>
            </div>
          </div>
        </SectionCard>

        <CompactSalesSummary />

        <SectionCard className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Top Products</h2>
            <Link href="/mobile-inventory" className="flex items-center gap-1 text-sm text-slate-300">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {topProducts.slice(0, 2).map((product) => (
            <ProductListItem key={product.name} product={product} />
          ))}
        </SectionCard>

        <SectionCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Low Stock Alerts</h2>
            <Link href="/mobile-inventory" className="flex items-center gap-1 text-sm text-slate-300">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2">
            {lowStockPreview.map((product) => (
              <div
                key={product.name}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                  <Box className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-orange-400">
                    {product.detail.toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
