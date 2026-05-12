"use client";

import Link from "next/link";
import { Search, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
  StatusBadge,
  TopHeader,
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
type CustomerFilter = "All" | "Active" | "To Collect" | "New";
type CustomerStatus = "Active" | "To collect" | "New";

interface SupplierOrderRow {
  id: string;
  supplier_name: string;
  status: string;
  total_amount: number | string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerSummary {
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  pendingCollection: number;
  collectedValue: number;
  totalValue: number;
  lastOrderDate: string;
  activeOrders: number;
  status: CustomerStatus;
}

const CUSTOMER_FILTERS: CustomerFilter[] = ["All", "Active", "To Collect", "New"];
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

function buildCustomerSummaries(orders: SupplierOrderRow[]): CustomerSummary[] {
  const groups = new Map<string, SupplierOrderRow[]>();

  for (const order of orders) {
    const name = order.supplier_name?.trim() || "Unknown customer";
    groups.set(name, [...(groups.get(name) ?? []), order]);
  }

  return Array.from(groups.entries())
    .map(([name, customerOrders]) => {
      const sortedOrders = [...customerOrders].sort(
        (first, second) =>
          new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
      );
      const deliveredOrders = sortedOrders.filter(
        (order) => getEffectiveStatus(order) === "Delivered"
      );
      const pendingCollection = deliveredOrders
        .filter((order) => getPaymentStatus(order.notes) !== "collected")
        .reduce((total, order) => total + getOrderAmount(order), 0);
      const collectedValue = deliveredOrders
        .filter((order) => getPaymentStatus(order.notes) === "collected")
        .reduce((total, order) => total + getOrderAmount(order), 0);
      const totalValue = sortedOrders.reduce((total, order) => total + getOrderAmount(order), 0);
      const activeOrders = sortedOrders.filter((order) =>
        ACTIVE_STATUSES.includes(getEffectiveStatus(order))
      ).length;
      const status: CustomerStatus =
        pendingCollection > 0 ? "To collect" : sortedOrders.length <= 1 ? "New" : "Active";

      return {
        name,
        totalOrders: sortedOrders.length,
        deliveredOrders: deliveredOrders.length,
        pendingCollection,
        collectedValue,
        totalValue,
        lastOrderDate: sortedOrders[0]?.created_at ?? "",
        activeOrders,
        status,
      };
    })
    .sort((first, second) => {
      const firstDate = new Date(first.lastOrderDate).getTime();
      const secondDate = new Date(second.lastOrderDate).getTime();
      return secondDate - firstDate;
    });
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/20">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function CustomerTabs({
  activeFilter,
  customers,
  onChange,
}: {
  activeFilter: CustomerFilter;
  customers: CustomerSummary[];
  onChange: (filter: CustomerFilter) => void;
}) {
  function getCount(filter: CustomerFilter): number {
    if (filter === "All") return customers.length;
    if (filter === "To Collect") {
      return customers.filter((customer) => customer.pendingCollection > 0).length;
    }
    if (filter === "Active") {
      return customers.filter(
        (customer) => customer.activeOrders > 0 || customer.totalOrders > 0
      ).length;
    }
    return customers.filter((customer) => customer.status === filter).length;
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-max rounded-2xl border border-white/10 bg-white/[0.025] p-1">
        {CUSTOMER_FILTERS.map((filter) => {
          const active = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onChange(filter)}
              className={`flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-300"
              }`}
            >
              <span>{filter}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15" : "bg-white/10 text-slate-400"}`}>
                {getCount(filter)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomerCard({
  customer,
  onNewOrder,
}: {
  customer: CustomerSummary;
  onNewOrder: () => void;
}) {
  return (
    <SectionCard className="p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-400">
          <Store className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-white">{customer.name}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {customer.totalOrders} orders - Last {formatDate(customer.lastOrderDate)}
              </p>
            </div>
            <StatusBadge status={customer.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-slate-500">Pending</p>
              <p className="mt-1 font-bold text-orange-400">
                {formatCDF(customer.pendingCollection)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-slate-500">Collected</p>
              <p className="mt-1 font-bold text-emerald-400">
                {formatCDF(customer.collectedValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-slate-500">Active orders</p>
              <p className="mt-1 font-bold text-white">{customer.activeOrders}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-slate-500">Delivered</p>
              <p className="mt-1 font-bold text-white">{customer.deliveredOrders}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={`/mobile-customers/${encodeURIComponent(customer.name)}`}
              className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200"
            >
              View Details
            </Link>
            <button
              type="button"
              onClick={onNewOrder}
              className="min-h-11 rounded-xl bg-blue-600/70 px-3 py-2 text-sm font-semibold text-white"
            >
              New Order
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function MobileCustomersPage() {
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CustomerFilter>("All");
  const [message, setMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
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

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const customers = useMemo(() => buildCustomerSummaries(orders), [orders]);
  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        normalizedSearch.length === 0 || customer.name.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Active"
          ? customer.activeOrders > 0 || customer.totalOrders > 0
          : activeFilter === "To Collect"
            ? customer.pendingCollection > 0
            : customer.status === activeFilter);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, customers, searchQuery]);
  const summary = useMemo(() => {
    const activeOrders = customers.reduce((total, customer) => total + customer.activeOrders, 0);
    const pendingCollection = customers.reduce(
      (total, customer) => total + customer.pendingCollection,
      0
    );
    const collectedValue = customers.reduce((total, customer) => total + customer.collectedValue, 0);

    return { activeOrders, collectedValue, pendingCollection };
  }, [customers]);

  function getEmptyStateText(): string {
    if (searchQuery.trim()) return "No customers found.";
    if (activeFilter === "To Collect") return "No customers with pending collection.";
    if (activeFilter === "New") return "No new customers.";
    if (activeFilter === "Active") return "No active customers.";
    return "No customers yet.";
  }

  return (
    <MobilePageShell active="customers">
      <TopHeader showSearch />

      <main className="mt-10 space-y-4 pb-40">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-blue-400">Customers</p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-white">Customers</h1>
          <p className="mt-2 text-base leading-7 text-slate-300">
            Manage boutiques, bars and customer relationships.
          </p>
        </section>

        {message ? (
          <SectionCard className="border-blue-400/20 bg-blue-500/10 p-4 text-sm font-semibold text-blue-100">
            {message}
          </SectionCard>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <SummaryCard label="Total Customers" value={String(customers.length)} />
          <SummaryCard label="Active Orders" value={String(summary.activeOrders)} />
          <SummaryCard label="Pending Collection" value={formatCDF(summary.pendingCollection)} />
          <SummaryCard label="Collected Value" value={formatCDF(summary.collectedValue)} />
        </section>

        <label className="relative block">
          <span className="sr-only">Search customer by name.</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search customer by name."
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
          />
        </label>

        <CustomerTabs
          activeFilter={activeFilter}
          customers={customers}
          onChange={setActiveFilter}
        />

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading customers...
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Could not load customers.
          </SectionCard>
        ) : null}

        {!loading && !error && filteredCustomers.length === 0 ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            {getEmptyStateText()}
          </SectionCard>
        ) : null}

        <section className="space-y-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.name}
              customer={customer}
              onNewOrder={() => setMessage("New order creation coming soon")}
            />
          ))}
        </section>
      </main>
    </MobilePageShell>
  );
}
