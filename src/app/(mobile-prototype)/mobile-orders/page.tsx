"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";

import {
  MobilePageShell,
  ProductThumb,
  SectionCard,
  StatusBadge,
  TopHeader,
} from "@/components/mobile-prototype/components";
import { orderStats } from "@/components/mobile-prototype/mock-data";
import type {
  MobileStat,
  StatIconName,
  Tone,
} from "@/components/mobile-prototype/mock-data";
import {
  type Order,
  type OrderStatus,
  useMobileOrders,
} from "../_store/mobile-orders-store";

type OrderStatusFilter = "All Orders" | "Pending" | "Confirmed" | "In Transit" | "Delivered";

const statIcons: Record<StatIconName, LucideIcon> = {
  "badge-check": BadgeCheck,
  box: PackageCheck,
  briefcase: PackageCheck,
  clock: Clock3,
  dollar: PackageCheck,
  "package-check": PackageCheck,
  truck: Truck,
  "x-circle": PackageCheck,
};

const toneStyles: Record<Tone, { text: string; bg: string; border: string; button: string }> = {
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-400/20",
    button: "bg-blue-600 text-white",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-400/20",
    button: "bg-orange-600 text-white",
  },
  green: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/20",
    button: "bg-emerald-600 text-white",
  },
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-400/20",
    button: "bg-purple-600 text-white",
  },
  red: {
    text: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-400/20",
    button: "bg-red-600 text-white",
  },
  pink: {
    text: "text-fuchsia-400",
    bg: "bg-fuchsia-500/15",
    border: "border-fuchsia-400/20",
    button: "bg-fuchsia-600 text-white",
  },
};

function CompactOrderStatCard({ stat }: { stat: MobileStat }) {
  const Icon = statIcons[stat.iconName];
  const tone = toneStyles[stat.tone];

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-3 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone.border} ${tone.bg} ${tone.text}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-300">{stat.label}</p>
          <p className="mt-0.5 text-2xl font-black text-white">{stat.value}</p>
        </div>
      </div>
      <p className={`mt-2 truncate text-xs font-medium ${tone.text}`}>{stat.helper}</p>
    </div>
  );
}

function OrderStatusTabs({
  tabs,
  activeStatus,
  onChange,
}: {
  tabs: Array<{ label: OrderStatusFilter; count: string }>;
  activeStatus: OrderStatusFilter;
  onChange: (status: OrderStatusFilter) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-max rounded-2xl border border-white/10 bg-white/[0.025] p-1">
        {tabs.map((tab) => {
          const active = activeStatus === tab.label;
          return (
            <button
              key={`${tab.label}-${tab.count}`}
              type="button"
              onClick={() => onChange(tab.label)}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15" : "bg-white/10 text-slate-400"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getOrderDetailsHref(orderId: string): string {
  return `/mobile-orders/${encodeURIComponent(orderId.replace(/^#/, ""))}`;
}

function getDisplayOrderNumber(index: number): string {
  return `#${3291 + Math.max(index, 0)}`;
}

function getStatusTone(status: OrderStatus): Tone {
  if (
    status === "Pending" ||
    status === "Preparing" ||
    status === "Ready for Pickup" ||
    status === "Packed"
  ) {
    return "orange";
  }
  if (status === "Confirmed") return "green";
  if (status === "In Transit") return "blue";
  if (status === "Cancelled") return "red";
  return "purple";
}

function getActionLabel(status: OrderStatus): string {
  if (status === "Pending") return "Confirm Order";
  if (status === "Confirmed") return "Prepare Order";
  if (status === "Preparing" || status === "Packed") return "Mark Ready";
  if (status === "Ready for Pickup") return "Send to Delivery";
  if (status === "In Transit") return "Track Order";
  return "View Receipt";
}

function canAdvanceOrder(status: OrderStatus): boolean {
  return (
    status === "Pending" ||
    status === "Confirmed" ||
    status === "Packed" ||
    status === "Preparing" ||
    status === "Ready for Pickup"
  );
}

function getActionSuccessMessage(status: OrderStatus): string | null {
  if (status === "Pending") return "Order confirmed successfully";
  if (status === "Confirmed") return "Order is now being prepared";
  if (status === "Preparing" || status === "Packed") return "Order marked ready for pickup";
  if (status === "Ready for Pickup") return "Order sent to delivery";
  return null;
}

function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat("fr-CD").format(amount)} CDF`;
}

function getItemsLabel(itemsCount: number): string {
  if (itemsCount === 0) return "No items linked";
  return `${itemsCount} ${itemsCount === 1 ? "item" : "items"}`;
}

function getActionHref(order: Order): string | null {
  if (order.status === "In Transit") return "/mobile-deliveries";
  if (order.status === "Delivered") return getOrderDetailsHref(order.id);
  return null;
}

function MobileOrderCard({
  order,
  displayOrderNumber,
  onAction,
}: {
  order: Order;
  displayOrderNumber: string;
  onAction: (orderId: string) => void;
}) {
  const tone = toneStyles[getStatusTone(order.status)];
  const actionLabel = getActionLabel(order.status);
  const actionHref = getActionHref(order);
  const firstProduct = order.products[0];
  const remainingProductsCount = Math.max(order.products.length - 1, 0);

  return (
    <SectionCard className="overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.bg} ${tone.text}`}>
          <BriefcaseBusiness className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-white">Order {displayOrderNumber}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-300">
            <MapPin className="h-4 w-4 text-blue-400" />
            {order.store}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {getItemsLabel(order.itemsCount)} <span className="px-1">-</span> {order.time}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{formatAmount(order.amount)}</p>
          <p className="mt-1 text-xs text-slate-400">{order.paymentMethod}</p>
          <div className="mt-3">
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-white/10 p-4 min-[390px]:grid-cols-[1fr_auto] min-[390px]:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {order.products.length > 0 ? (
            <div className="flex -space-x-2">
              {order.products.slice(0, 2).map((product) => (
                <ProductThumb key={product.name} product={product} size="sm" />
              ))}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-200">
              {firstProduct ? firstProduct.name : "No items linked"}
            </p>
            {remainingProductsCount > 0 ? (
              <p className="text-xs text-slate-400">
                +{remainingProductsCount} more
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={getOrderDetailsHref(order.id)}
            className="flex items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-200"
          >
            View Details
          </Link>
          {actionHref ? (
            <Link
              href={actionHref}
              className={`flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${tone.button}`}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (canAdvanceOrder(order.status)) {
                  onAction(order.id);
                }
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${tone.button}`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export default function MobileOrdersPage() {
  const [activeStatus, setActiveStatus] = useState<OrderStatusFilter>("All Orders");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [devAction, setDevAction] = useState<"seed" | "clear" | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    orders,
    advanceOrderStatus,
    clearTestOrders,
    error,
    seedTestOrders,
  } = useMobileOrders();
  const visibleError = actionError ?? error;
  const showDevOrderTools = process.env.NODE_ENV !== "production";

  function showSuccessMessage(message: string) {
    setActionError(null);
    setSuccessMessage(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }

  async function handleOrderAction(orderId: string) {
    setActionError(null);
    setSuccessMessage(null);
    const order = orders.find((item) => item.id === orderId);
    const message = order ? getActionSuccessMessage(order.status) : null;
    const result = await advanceOrderStatus(orderId);

    if (result.success && message) {
      showSuccessMessage(message);
      return;
    }

    if (result.error) {
      setActionError(result.error);
    }
  }

  async function handleSeedTestOrders() {
    setActionError(null);
    setSuccessMessage(null);
    setDevAction("seed");

    const result = await seedTestOrders();

    setDevAction(null);

    if (result.success) {
      showSuccessMessage("Test orders seeded");
      return;
    }

    if (result.error) setActionError(result.error);
  }

  async function handleClearTestOrders() {
    setActionError(null);
    setSuccessMessage(null);
    setDevAction("clear");

    const result = await clearTestOrders();

    setDevAction(null);

    if (result.success) {
      showSuccessMessage("Test orders cleared");
      return;
    }

    if (result.error) setActionError(result.error);
  }

  const orderTabs = useMemo<Array<{ label: OrderStatusFilter; count: string }>>(() => {
    const pending = orders.filter((order) => order.status === "Pending").length;
    const confirmed = orders.filter((order) =>
      ["Confirmed", "Preparing", "Ready for Pickup", "Packed"].includes(order.status)
    ).length;
    const inTransit = orders.filter((order) => order.status === "In Transit").length;
    const delivered = orders.filter((order) => order.status === "Delivered").length;

    return [
      { label: "All Orders", count: String(orders.length) },
      { label: "Pending", count: String(pending) },
      { label: "Confirmed", count: String(confirmed) },
      { label: "In Transit", count: String(inTransit) },
      { label: "Delivered", count: String(delivered) },
    ];
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (activeStatus === "All Orders") return orders;
    if (activeStatus === "Confirmed") {
      return orders.filter((order) =>
        ["Confirmed", "Preparing", "Ready for Pickup", "Packed"].includes(order.status)
      );
    }
    return orders.filter((order) => order.status === activeStatus);
  }, [activeStatus, orders]);

  const displayedStats = useMemo(
    () =>
      orderStats.map((stat) => {
        const tab = orderTabs.find((item) => item.label === stat.label);
        return tab ? { ...stat, value: tab.count } : stat;
      }),
    [orderTabs]
  );

  return (
    <MobilePageShell active="orders">
      <TopHeader showSearch />

      <main className="mt-10 space-y-4 pb-40">
        <section>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="mt-2 text-base text-slate-300">
            Track, manage and fulfill customer orders.
          </p>
        </section>

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-100">{successMessage}</p>
            </div>
          </div>
        ) : null}

        {visibleError ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
            {visibleError}
          </SectionCard>
        ) : null}

        {showDevOrderTools ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSeedTestOrders}
              disabled={devAction !== null}
              className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-100 disabled:opacity-50"
            >
              {devAction === "seed" ? "Seeding..." : "Seed test orders"}
            </button>
            <button
              type="button"
              onClick={handleClearTestOrders}
              disabled={devAction !== null}
              className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-50"
            >
              {devAction === "clear" ? "Clearing..." : "Clear test orders"}
            </button>
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          {displayedStats.map((stat) => (
            <CompactOrderStatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <div>
          <label className="relative block">
            <span className="sr-only">Search by order ID or store...</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by order ID or store..."
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
            />
          </label>
        </div>

        <OrderStatusTabs tabs={orderTabs} activeStatus={activeStatus} onChange={setActiveStatus} />

        <section className="space-y-3">
          {visibleOrders.map((order, index) => {
            const orderIndex = orders.findIndex((item) => item.id === order.id);
            const displayOrderNumber = getDisplayOrderNumber(
              orderIndex >= 0 ? orderIndex : index
            );

            return (
              <MobileOrderCard
                key={order.id}
                order={order}
                displayOrderNumber={displayOrderNumber}
                onAction={handleOrderAction}
              />
            );
          })}
        </section>
      </main>
    </MobilePageShell>
  );
}
