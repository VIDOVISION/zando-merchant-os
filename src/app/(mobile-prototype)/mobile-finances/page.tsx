"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MobilePageShell,
  SectionCard,
  StatCard,
  StatusBadge,
  TopHeader,
} from "@/components/mobile-prototype/components";
import type { MobileStat, Tone } from "@/components/mobile-prototype/mock-data";

type EffectiveOrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready for Pickup"
  | "In Transit"
  | "Delivered"
  | "Cancelled";
type PaymentStatus = "pending_collection" | "collected";
type TransactionStatus = "Pending collection" | "Collected" | "Expected";

interface SupplierOrderRow {
  id: string;
  supplier_name: string;
  status: string;
  total_amount: number | string | null;
  notes: string | null;
  created_at: string;
}

interface BreakdownItem {
  label: string;
  amount: string;
  tone: Tone;
}

interface Transaction {
  title: string;
  store: string;
  method: string;
  amount: string;
  status: TransactionStatus;
  tone: Tone;
}

interface CollectionItem {
  orderId: string;
  name: string;
  detail: string;
  tone: Tone;
}

const MOBILE_STATUS_NOTE_PREFIX = "mobile_status=";
const PAYMENT_STATUS_NOTE_PREFIX = "payment_status=";

const toneText: Record<Tone, string> = {
  blue: "text-blue-400",
  orange: "text-orange-400",
  green: "text-emerald-400",
  purple: "text-purple-400",
  red: "text-red-400",
  pink: "text-fuchsia-400",
};

const toneBg: Record<Tone, string> = {
  blue: "bg-blue-500/15",
  orange: "bg-orange-500/15",
  green: "bg-emerald-500/15",
  purple: "bg-purple-500/15",
  red: "bg-red-500/15",
  pink: "bg-fuchsia-500/15",
};

function splitNotes(notes?: string | null): string[] {
  return (notes ?? "")
    .split(";")
    .map((note) => note.trim())
    .filter(Boolean);
}

function getEffectiveStatus(order: SupplierOrderRow): EffectiveOrderStatus {
  const mobileStatusNote = splitNotes(order.notes).find((note) =>
    note.startsWith(MOBILE_STATUS_NOTE_PREFIX)
  );
  const mobileStatus = mobileStatusNote?.replace(MOBILE_STATUS_NOTE_PREFIX, "");

  if (
    mobileStatus === "Pending" ||
    mobileStatus === "Confirmed" ||
    mobileStatus === "Preparing" ||
    mobileStatus === "Ready for Pickup" ||
    mobileStatus === "In Transit" ||
    mobileStatus === "Delivered" ||
    mobileStatus === "Cancelled"
  ) {
    return mobileStatus;
  }

  if (order.status === "Draft") return "Pending";
  if (order.status === "Packed") return "Preparing";
  if (
    order.status === "Pending" ||
    order.status === "Confirmed" ||
    order.status === "In Transit" ||
    order.status === "Delivered" ||
    order.status === "Cancelled"
  ) {
    return order.status;
  }

  return "Pending";
}

function getOrderAmount(order: SupplierOrderRow): number {
  const amount = Number(order.total_amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getPaymentStatus(notes?: string | null): PaymentStatus {
  const paymentStatusNote = splitNotes(notes).find((note) =>
    note.startsWith(PAYMENT_STATUS_NOTE_PREFIX)
  );
  const paymentStatus = paymentStatusNote?.replace(PAYMENT_STATUS_NOTE_PREFIX, "");
  return paymentStatus === "collected" ? "collected" : "pending_collection";
}

function setPaymentStatusInNotes(notes: string | null, status: PaymentStatus): string {
  const notesWithoutPaymentStatus = splitNotes(notes).filter(
    (note) => !note.startsWith(PAYMENT_STATUS_NOTE_PREFIX)
  );
  return [...notesWithoutPaymentStatus, `${PAYMENT_STATUS_NOTE_PREFIX}${status}`].join(";");
}

function formatCDF(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-CD").format(Number.isFinite(amount) ? amount : 0)} CDF`;
}

function getDisplayOrderNumber(index: number): string {
  return `#${3291 + Math.max(index, 0)}`;
}

function isToday(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
}

function PaymentBreakdownCard({ item }: { item: BreakdownItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className={`mb-3 h-2 w-10 rounded-full ${toneBg[item.tone]}`} />
      <p className="text-sm text-slate-400">{item.label}</p>
      <p className={`mt-2 text-lg font-bold ${toneText[item.tone]}`}>{item.amount}</p>
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">{transaction.title}</p>
          <p className="mt-1 text-sm text-slate-400">{transaction.store}</p>
          <p className="mt-2 text-sm text-slate-300">{transaction.method}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-black ${toneText[transaction.tone]}`}>
            {transaction.amount}
          </p>
          <div className="mt-2">
            <StatusBadge status={transaction.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({
  collection,
  onConfirm,
  confirming,
}: {
  collection: CollectionItem;
  onConfirm: (orderId: string) => void;
  confirming: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{collection.name}</p>
          <p className={`mt-1 text-sm font-semibold ${toneText[collection.tone]}`}>
            {collection.detail}
          </p>
        </div>
        <div className={`h-3 w-3 shrink-0 rounded-full ${toneBg[collection.tone]}`} />
      </div>
      <button
        type="button"
        onClick={() => onConfirm(collection.orderId)}
        disabled={confirming}
        className="mt-4 min-h-11 w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/15 px-4 text-sm font-bold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirming ? "Confirming..." : "Confirm Collection"}
      </button>
    </div>
  );
}

export default function MobileFinancesPage() {
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadFinances() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setOrders([]);
        setError("Could not load finances.");
        setLoading(false);
        return;
      }

      const { data, error: ordersError } = await supabase
        .from("supplier_orders")
        .select("id, supplier_name, status, total_amount, notes, created_at")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (ordersError) {
        setOrders([]);
        setError("Could not load finances.");
        setLoading(false);
        return;
      }

      setOrders((data as SupplierOrderRow[] | null) ?? []);
      setLoading(false);
    }

    void loadFinances();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  async function handleConfirmCollection(orderId: string) {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;

    const previousOrders = orders;
    const nextNotes = setPaymentStatusInNotes(currentOrder.notes, "collected");

    setConfirmingOrderId(orderId);
    setError(null);
    setSuccessMessage(null);
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, notes: nextNotes } : order
      )
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setOrders(previousOrders);
      setError("Could not confirm collection");
      setConfirmingOrderId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("supplier_orders")
      .update({
        notes: nextNotes,
      })
      .eq("id", orderId)
      .eq("merchant_id", user.id);

    if (updateError) {
      setOrders(previousOrders);
      setError("Could not confirm collection");
      setConfirmingOrderId(null);
      return;
    }

    setSuccessMessage("Collection confirmed");
    setConfirmingOrderId(null);
  }

  const financeData = useMemo(() => {
    const deliveredOrders = orders.filter((order) => getEffectiveStatus(order) === "Delivered");
    const collectedDeliveredOrders = deliveredOrders.filter(
      (order) => getPaymentStatus(order.notes) === "collected"
    );
    const pendingDeliveredOrders = deliveredOrders.filter(
      (order) => getPaymentStatus(order.notes) !== "collected"
    );
    const todayDeliveredOrders = deliveredOrders.filter((order) => isToday(order.created_at));
    const inTransitOrders = orders.filter((order) => getEffectiveStatus(order) === "In Transit");
    const revenueOrders = todayDeliveredOrders.length > 0 ? todayDeliveredOrders : deliveredOrders;
    const revenue = revenueOrders.reduce((total, order) => total + getOrderAmount(order), 0);
    const pendingCollection = pendingDeliveredOrders.reduce(
      (total, order) => total + getOrderAmount(order),
      0
    );
    const availableBalance = collectedDeliveredOrders.reduce(
      (total, order) => total + getOrderAmount(order),
      0
    );
    const deliveredCashTotal = deliveredOrders.reduce(
      (total, order) => total + getOrderAmount(order),
      0
    );

    const stats: MobileStat[] = [
      {
        label: "Delivered Today",
        value: formatCDF(revenue),
        helper: pendingCollection > 0 ? "Awaiting collection" : "All collected",
        tone: "green",
        iconName: "dollar",
      },
      {
        label: "Pending Payments",
        value: formatCDF(pendingCollection),
        helper: `${pendingDeliveredOrders.length} orders waiting`,
        tone: "orange",
        iconName: "clock",
      },
      {
        label: "Cash to Collect",
        value: formatCDF(pendingCollection),
        helper: pendingCollection > 0 ? "From delivered orders" : "No cash pending",
        tone: "blue",
        iconName: "truck",
      },
      {
        label: "BNPL Balance",
        value: formatCDF(0),
        helper: "Not enabled yet",
        tone: "purple",
        iconName: "package-check",
      },
    ];

    const breakdown: BreakdownItem[] = [
      { label: "Mobile Money", amount: formatCDF(0), tone: "green" },
      { label: "Cash", amount: formatCDF(deliveredCashTotal), tone: "blue" },
      { label: "Bank Transfer", amount: formatCDF(0), tone: "purple" },
      { label: "BNPL Credit", amount: formatCDF(0), tone: "orange" },
    ];

    const collectionsToday: CollectionItem[] = pendingDeliveredOrders.slice(0, 5).map((order) => {
      const orderIndex = orders.findIndex((item) => item.id === order.id);

      return {
        orderId: order.id,
        name: `${getDisplayOrderNumber(orderIndex)} ${order.supplier_name}`,
        detail: `${formatCDF(getOrderAmount(order))} - To collect`,
        tone: "orange",
      };
    });

    const transactions: Transaction[] = [...deliveredOrders, ...inTransitOrders]
      .sort(
        (first, second) =>
          new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
      )
      .slice(0, 5)
      .map((order, index) => {
        const status = getEffectiveStatus(order);
        const delivered = status === "Delivered";
        const collected = delivered && getPaymentStatus(order.notes) === "collected";

        return {
          title: `Order ${getDisplayOrderNumber(
            orders.findIndex((item) => item.id === order.id) >= 0
              ? orders.findIndex((item) => item.id === order.id)
              : index
          )}`,
          store: order.supplier_name,
          method: "Cash on Delivery",
          amount: `+${formatCDF(getOrderAmount(order))}`,
          status: delivered ? (collected ? "Collected" : "Pending collection") : "Expected",
          tone: delivered ? (collected ? "green" : "orange") : "blue",
        };
      });

    return {
      stats,
      breakdown,
      collectionsToday,
      transactions,
      pendingCollection,
      availableBalance,
    };
  }, [orders]);

  const settlementTotal = financeData.availableBalance + financeData.pendingCollection;
  const paidWidth =
    settlementTotal > 0 ? (financeData.availableBalance / settlementTotal) * 100 : 0;
  const pendingWidth =
    settlementTotal > 0 ? (financeData.pendingCollection / settlementTotal) * 100 : 0;

  return (
    <MobilePageShell active="finances">
      <TopHeader showSearch />

      <main className="mt-10 space-y-4 pb-28">
        <section>
          <h1 className="text-3xl font-bold text-white">Finances</h1>
          <p className="mt-2 text-base leading-7 text-slate-300">
            Track revenue, payments and balances.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {financeData.stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading finances...
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            {error}
          </SectionCard>
        ) : null}

        {successMessage ? (
          <SectionCard className="border-emerald-400/20 bg-emerald-500/10 p-5 text-sm font-semibold text-emerald-100">
            {successMessage}
          </SectionCard>
        ) : null}

        <SectionCard className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Available Balance</p>
              <p className="mt-3 text-4xl font-black text-white">
                {formatCDF(financeData.availableBalance)}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Collected cash ready
              </p>
            </div>
            <StatusBadge status={financeData.availableBalance > 0 ? "Paid" : "Pending"} />
          </div>

          <button
            type="button"
            disabled
            className="mt-5 min-h-12 w-full rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white opacity-50"
          >
            Request Payout
          </button>

          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-xs text-slate-500">Last payout</p>
              <p className="mt-1 text-sm font-bold text-white">{formatCDF(0)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Date</p>
              <p className="mt-1 text-sm font-bold text-white">None</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 text-sm font-bold text-orange-400">Payout coming soon</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-xl font-bold text-white">Collections Today</h2>
          <p className="mt-2 text-sm text-slate-400">Delivered orders waiting for collection.</p>
          <div className="mt-4 space-y-3">
            {financeData.collectionsToday.length > 0 ? (
              financeData.collectionsToday.map((collection) => (
                <CollectionCard
                  key={collection.orderId}
                  collection={collection}
                  onConfirm={handleConfirmCollection}
                  confirming={confirmingOrderId === collection.orderId}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
                No delivered orders to collect yet.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-xl font-bold text-white">Payment Breakdown</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {financeData.breakdown.map((item) => (
              <PaymentBreakdownCard key={item.label} item={item} />
            ))}
          </div>
        </SectionCard>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
          {financeData.transactions.length > 0 ? (
            financeData.transactions.map((transaction) => (
              <TransactionCard
                key={`${transaction.title}-${transaction.store}`}
                transaction={transaction}
              />
            ))
          ) : (
            <SectionCard className="p-5 text-sm text-slate-400">
              No recent delivered or in-transit orders yet.
            </SectionCard>
          )}
        </section>

        <SectionCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Settlement Overview</h2>
              <p className="mt-2 text-sm text-slate-400">Current payment pipeline</p>
            </div>
            <StatusBadge status="Pending" />
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Paid</span>
              <span className="font-bold text-emerald-400">
                {formatCDF(financeData.availableBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Pending</span>
              <span className="font-bold text-orange-400">
                {formatCDF(financeData.pendingCollection)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Failed</span>
              <span className="font-bold text-red-400">{formatCDF(0)}</span>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="flex h-full">
              <div className="bg-emerald-500" style={{ width: `${paidWidth}%` }} />
              <div className="bg-orange-500" style={{ width: `${pendingWidth}%` }} />
              <div className="w-0 bg-red-500" />
            </div>
          </div>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
