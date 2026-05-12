"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bell, MapPin, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
  StatusBadge,
} from "@/components/mobile-prototype/components";
import { createClient } from "@/lib/supabase/client";

type EffectiveOrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready for Pickup"
  | "In Transit"
  | "Delivered"
  | "Cancelled";
type CustomerStatus = "Active" | "To collect" | "New";

interface SupplierOrderRow {
  id: string;
  supplier_name: string;
  status: string;
  total_amount: number | string | null;
  notes: string | null;
  created_at: string;
}

const MOBILE_STATUS_NOTE_PREFIX = "mobile_status=";
const PAYMENT_STATUS_NOTE_PREFIX = "payment_status=";
const ACTIVE_STATUSES: EffectiveOrderStatus[] = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "In Transit",
];

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

function getPaymentStatus(notes?: string | null): "pending_collection" | "collected" {
  const paymentStatusNote = splitNotes(notes).find((note) =>
    note.startsWith(PAYMENT_STATUS_NOTE_PREFIX)
  );
  const paymentStatus = paymentStatusNote?.replace(PAYMENT_STATUS_NOTE_PREFIX, "");
  return paymentStatus === "collected" ? "collected" : "pending_collection";
}

function getOrderAmount(order: SupplierOrderRow): number {
  const amount = Number(order.total_amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCDF(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-CD").format(Number.isFinite(amount) ? amount : 0)} CDF`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";

  return new Intl.DateTimeFormat("fr-CD", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDisplayOrderNumber(index: number): string {
  return `#${3291 + Math.max(index, 0)}`;
}

function getOrderDetailsHref(orderId: string): string {
  return `/mobile-orders/${encodeURIComponent(orderId.replace(/^#/, ""))}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/20">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function RecentOrderCard({
  order,
  displayNumber,
}: {
  order: SupplierOrderRow;
  displayNumber: string;
}) {
  const status = getEffectiveStatus(order);
  const paymentStatus =
    status === "Delivered"
      ? getPaymentStatus(order.notes) === "collected"
        ? "Collected"
        : "Pending collection"
      : "Pending collection";

  return (
    <SectionCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-white">Order {displayNumber}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
            <MapPin className="h-4 w-4 text-blue-400" />
            {formatDate(order.created_at)}
          </p>
          <p className="mt-3 text-lg font-black text-emerald-400">
            {formatCDF(getOrderAmount(order))}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={status} />
          <StatusBadge status={paymentStatus} />
        </div>
      </div>
      <Link
        href={getOrderDetailsHref(order.id)}
        className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200"
      >
        View Order
      </Link>
    </SectionCard>
  );
}

export default function MobileCustomerDetailPage() {
  const params = useParams<{ customerName: string }>();
  const customerName = decodeURIComponent(params.customerName ?? "");
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomerOrders() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setOrders([]);
        setError("Could not load customers.");
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
        setError("Could not load customers.");
        setLoading(false);
        return;
      }

      setOrders((data as SupplierOrderRow[] | null) ?? []);
      setLoading(false);
    }

    void loadCustomerOrders();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const customerOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (order.supplier_name?.trim() || "Unknown customer").toLowerCase() ===
          customerName.toLowerCase()
      ),
    [customerName, orders]
  );
  const detail = useMemo(() => {
    const deliveredOrders = customerOrders.filter(
      (order) => getEffectiveStatus(order) === "Delivered"
    );
    const totalValue = customerOrders.reduce((total, order) => total + getOrderAmount(order), 0);
    const pendingCollection = deliveredOrders
      .filter((order) => getPaymentStatus(order.notes) !== "collected")
      .reduce((total, order) => total + getOrderAmount(order), 0);
    const collectedValue = deliveredOrders
      .filter((order) => getPaymentStatus(order.notes) === "collected")
      .reduce((total, order) => total + getOrderAmount(order), 0);
    const activeOrders = customerOrders.filter((order) =>
      ACTIVE_STATUSES.includes(getEffectiveStatus(order))
    ).length;
    const status: CustomerStatus =
      pendingCollection > 0 ? "To collect" : customerOrders.length <= 1 ? "New" : "Active";
    const lastOrderDate = customerOrders[0]?.created_at ?? "";

    return {
      activeOrders,
      collectedValue,
      deliveredOrders: deliveredOrders.length,
      lastOrderDate,
      pendingCollection,
      status,
      totalValue,
      totalOrders: customerOrders.length,
    };
  }, [customerOrders]);

  return (
    <MobilePageShell active="customers">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/mobile-customers"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
          aria-label="Back to customers"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-lg font-black text-white">Customer Details</p>
          <p className="text-xs text-slate-500">Boutique profile</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-slate-300"
            type="button"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-[#06111d]" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-orange-500 to-slate-900 text-sm font-bold">
            PS
          </div>
        </div>
      </header>

      <main className="mt-6 space-y-4 pb-40">
        <SectionCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-400">
              <Store className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.24em] text-blue-400">Customer</p>
              <h1 className="mt-2 break-words text-3xl font-black text-white">
                {customerName || "Unknown customer"}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Orders, collections and recent activity.
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <StatusBadge status={detail.status} />
            </div>
          </div>
        </SectionCard>

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading customer...
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Could not load customer details.
          </SectionCard>
        ) : null}

        {!loading && !error && customerOrders.length === 0 ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            No customers yet.
          </SectionCard>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <SummaryCard label="Total Orders" value={String(detail.totalOrders)} />
          <SummaryCard label="Active Orders" value={String(detail.activeOrders)} />
          <SummaryCard label="Delivered Orders" value={String(detail.deliveredOrders)} />
          <SummaryCard label="Last Order" value={detail.lastOrderDate ? formatDate(detail.lastOrderDate) : "None"} />
          <SummaryCard label="Total Value" value={formatCDF(detail.totalValue)} />
          <SummaryCard label="Pending Collection" value={formatCDF(detail.pendingCollection)} />
          <SummaryCard label="Collected Value" value={formatCDF(detail.collectedValue)} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black text-white">Recent Orders</h2>
          {customerOrders.slice(0, 8).map((order) => {
            const orderIndex = orders.findIndex((item) => item.id === order.id);
            return (
              <RecentOrderCard
                key={order.id}
                order={order}
                displayNumber={getDisplayOrderNumber(orderIndex)}
              />
            );
          })}
        </section>
      </main>
    </MobilePageShell>
  );
}
