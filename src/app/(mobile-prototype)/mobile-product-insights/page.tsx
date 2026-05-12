"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, Package, Trophy, WalletCards } from "lucide-react";

import {
  MobilePageShell,
  SectionCard,
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

interface SupplierOrderRow {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface SupplierOrderItemRow {
  supplier_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number | string | null;
  unit_price: number | string | null;
}

interface ProductPerformance {
  name: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

const MOBILE_STATUS_NOTE_PREFIX = "mobile_status=";

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

function getNumber(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCDF(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat("fr-CD").format(getNumber(value))} CDF`;
}

function buildProductPerformance(
  orders: SupplierOrderRow[],
  orderItems: SupplierOrderItemRow[]
): ProductPerformance[] {
  const deliveredOrderIds = new Set(
    orders.filter((order) => getEffectiveStatus(order) === "Delivered").map((order) => order.id)
  );
  const productMap = new Map<
    string,
    { quantity: number; revenue: number; orderIds: Set<string> }
  >();

  for (const item of orderItems) {
    if (!deliveredOrderIds.has(item.supplier_order_id)) continue;

    const name = item.name?.trim() || "Unknown product";
    const quantity = getNumber(item.quantity);
    const revenue = quantity * getNumber(item.unit_price);
    const current = productMap.get(name) ?? {
      quantity: 0,
      revenue: 0,
      orderIds: new Set<string>(),
    };

    current.quantity += quantity;
    current.revenue += revenue;
    current.orderIds.add(item.supplier_order_id);
    productMap.set(name, current);
  }

  return Array.from(productMap.entries()).map(([name, product]) => ({
    name,
    quantity: product.quantity,
    revenue: product.revenue,
    orderCount: product.orderIds.size,
  }));
}

function SummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "orange" | "purple";
}) {
  const toneClass = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    orange: "text-orange-400",
    purple: "text-purple-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className={`mt-2 truncate text-lg font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-slate-500">{helper}</p>
    </div>
  );
}

function ProductRankingList({
  emptyText,
  products,
}: {
  emptyText: string;
  products: ProductPerformance[];
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product, index) => {
        const averageOrderValue = product.orderCount > 0 ? product.revenue / product.orderCount : 0;

        return (
          <div
            key={product.name}
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-sm font-black text-blue-300">
                  #{index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Intl.NumberFormat("fr-CD").format(product.quantity)} sold
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-right text-sm font-black text-emerald-400">
                {formatCDF(product.revenue)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-400">
              <span>{product.orderCount} delivered orders</span>
              <span>Avg {formatCDF(averageOrderValue)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MobileProductInsightsPage() {
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<SupplierOrderItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadProductInsights() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setError("Could not load product insights.");
        setOrders([]);
        setOrderItems([]);
        setLoading(false);
        return;
      }

      const ordersResult = await supabase
        .from("supplier_orders")
        .select("id, status, notes, created_at")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (ordersResult.error) {
        setError("Could not load product insights.");
        setOrders([]);
        setOrderItems([]);
        setLoading(false);
        return;
      }

      const itemsResult = await supabase
        .from("supplier_order_items")
        .select("supplier_order_id, product_id, name, quantity, unit_price")
        .eq("merchant_id", user.id);

      if (cancelled) return;

      if (itemsResult.error) {
        setError("Could not load product insights.");
        setOrders((ordersResult.data as SupplierOrderRow[] | null) ?? []);
        setOrderItems([]);
        setLoading(false);
        return;
      }

      setOrders((ordersResult.data as SupplierOrderRow[] | null) ?? []);
      setOrderItems((itemsResult.data as SupplierOrderItemRow[] | null) ?? []);
      setLoading(false);
    }

    void loadProductInsights();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const productData = useMemo(() => {
    const products = buildProductPerformance(orders, orderItems);
    const bestSellers = [...products].sort((first, second) => second.quantity - first.quantity);
    const revenueRanking = [...products].sort((first, second) => second.revenue - first.revenue);
    const quantityTotal = products.reduce((total, product) => total + product.quantity, 0);
    const revenueTotal = products.reduce((total, product) => total + product.revenue, 0);

    return {
      bestSeller: bestSellers[0]?.name ?? "None yet",
      bestSellers,
      productCount: products.length,
      quantityTotal,
      revenueRanking,
      revenueTotal,
      topRevenueProduct: revenueRanking[0]?.name ?? "None yet",
    };
  }, [orderItems, orders]);

  return (
    <MobilePageShell active="dashboard">
      <TopHeader showSearch />

      <main className="mt-8 space-y-4 pb-40">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-400">
            Products
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white">
            Product Insights
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Best sellers and product performance.
          </p>
        </section>

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading product insights...
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Could not load product insights.
          </SectionCard>
        ) : null}

        {!loading && !error ? (
          <>
            <section className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Products Sold"
                value={new Intl.NumberFormat("fr-CD").format(productData.quantityTotal)}
                helper={`${productData.productCount} products`}
                tone="blue"
              />
              <SummaryCard
                label="Product Revenue"
                value={formatCDF(productData.revenueTotal)}
                helper="Delivered orders"
                tone="green"
              />
              <SummaryCard
                label="Best Seller"
                value={productData.bestSeller}
                helper="Highest quantity"
                tone="orange"
              />
              <SummaryCard
                label="Top Revenue Product"
                value={productData.topRevenueProduct}
                helper="Highest value"
                tone="purple"
              />
            </section>

            <SectionCard className="p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/15 text-orange-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Best Sellers</h2>
                  <p className="text-sm text-slate-400">Sorted by quantity sold</p>
                </div>
              </div>
              <ProductRankingList
                emptyText="No delivered product sales yet."
                products={productData.bestSellers}
              />
            </SectionCard>

            <SectionCard className="p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-400">
                  <WalletCards className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Revenue Ranking</h2>
                  <p className="text-sm text-slate-400">Sorted by delivered value</p>
                </div>
              </div>
              <ProductRankingList
                emptyText="No delivered product revenue yet."
                products={productData.revenueRanking}
              />
            </SectionCard>

            <SectionCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-400">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white">Need stock context?</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Compare sellers against current package stock.
                  </p>
                </div>
              </div>
              <Link
                href="/mobile-inventory"
                className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
              >
                Open Stock
                <Package className="h-4 w-4" />
              </Link>
            </SectionCard>
          </>
        ) : null}
      </main>
    </MobilePageShell>
  );
}
