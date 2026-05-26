"use client";

import Link from "next/link";
import { PackagePlus, Plus, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
} from "@/components/mobile-prototype/components";
import { ShopNavigation } from "../_components/ShopNavigation";
import { createClient } from "@/lib/supabase/client";
import { formatCDF, getNumber } from "@/lib/zando-format";
import {
  getShopInventory,
  getShopSales,
  isShopSaleFromToday,
  type ZandoShopInventoryItem,
  type ZandoShopSale,
} from "@/lib/zando-shop-sales";

const SHOP_NAME = "Patrice Mini Market";
const MOBILE_STATUS_NOTE_PREFIX = "mobile_status=";
const pendingSupplierStatuses = new Set(["Pending", "Confirmed", "Preparing"]);

interface SupplierOrderRow {
  id: string;
  status: string | null;
  notes: string | null;
}

interface ProductSummary {
  name: string;
  quantity: number;
  revenue: number;
}

function splitNotes(notes?: string | null): string[] {
  return (notes ?? "")
    .split(";")
    .map((note) => note.trim())
    .filter(Boolean);
}

function getEffectiveMobileStatus(order: SupplierOrderRow): string {
  const mobileStatusNote = splitNotes(order.notes).find((note) =>
    note.startsWith(MOBILE_STATUS_NOTE_PREFIX)
  );
  return mobileStatusNote?.replace(MOBILE_STATUS_NOTE_PREFIX, "") || order.status || "Pending";
}

function getTopProducts(sales: ZandoShopSale[]): ProductSummary[] {
  const groupedProducts = sales.reduce<Record<string, ProductSummary>>((collection, sale) => {
    const name = sale.product_name || "Unnamed product";

    if (!collection[name]) {
      collection[name] = { name, quantity: 0, revenue: 0 };
    }

    collection[name].quantity += sale.quantity;
    collection[name].revenue += sale.total;
    return collection;
  }, {});

  return Object.values(groupedProducts)
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 4);
}

function formatSaleTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MobileShopDashboardPage() {
  const [sales, setSales] = useState<ZandoShopSale[]>([]);
  const [shopInventory, setShopInventory] = useState<ZandoShopInventoryItem[]>([]);
  const [pendingSupplierOrders, setPendingSupplierOrders] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showSaleSavedMessage, setShowSaleSavedMessage] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setSales(getShopSales());
    setShopInventory(getShopInventory());

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("saleSaved") === "1") {
      setShowSaleSavedMessage(true);
      const timeout = window.setTimeout(() => setShowSaleSavedMessage(false), 3600);
      return () => window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingSupplierOrders() {
      setLoadingOrders(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setPendingSupplierOrders(0);
        setLoadingOrders(false);
        return;
      }

      const { data, error } = await supabase
        .from("supplier_orders")
        .select("id, status, notes")
        .eq("merchant_id", user.id)
        .eq("supplier_name", SHOP_NAME)
        .ilike("notes", "%source=shop_app%");

      if (cancelled) return;

      if (error) {
        setPendingSupplierOrders(0);
      } else {
        const count = ((data as SupplierOrderRow[] | null) ?? []).filter((order) =>
          pendingSupplierStatuses.has(getEffectiveMobileStatus(order))
        ).length;
        setPendingSupplierOrders(count);
      }

      setLoadingOrders(false);
    }

    void loadPendingSupplierOrders();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const todaysSales = useMemo(() => sales.filter(isShopSaleFromToday), [sales]);
  const revenueToday = todaysSales.reduce((total, sale) => total + sale.total, 0);
  const itemsSoldToday = todaysSales.reduce((total, sale) => total + sale.quantity, 0);
  const topProducts = useMemo(() => getTopProducts(sales), [sales]);

  return (
    <MobilePageShell active="dashboard" hideBottomNav>
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/mobile-shop-dashboard"
          className="font-heading text-4xl font-black italic tracking-tight text-white"
        >
          Zando
        </Link>
        <Link
          href="/mobile-shop-add-sale"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"
          aria-label="Add sale"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </header>

      <main className="mt-8 space-y-5 pb-28">
        <section>
          <h1 className="text-3xl font-black text-white">{SHOP_NAME}</h1>
          <p className="mt-2 text-base text-slate-300">Boutique business dashboard</p>
        </section>

        <ShopNavigation />

        {showSaleSavedMessage ? (
          <SectionCard className="border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-100">
            Sale saved successfully
          </SectionCard>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/mobile-shop"
            className="rounded-[1.5rem] border border-blue-400/20 bg-blue-600/15 p-4 text-white"
          >
            <PackagePlus className="h-5 w-5 text-blue-300" />
            <p className="mt-4 text-base font-black">Order Products</p>
            <p className="mt-1 text-sm leading-5 text-slate-300">Buy from supplier</p>
          </Link>
          <Link
            href="/mobile-shop-add-sale"
            className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-4 text-white"
          >
            <ReceiptText className="h-5 w-5 text-emerald-300" />
            <p className="mt-4 text-base font-black">Add Sale</p>
            <p className="mt-1 text-sm leading-5 text-slate-300">Record customer sale</p>
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <SectionCard className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Sales Today
            </p>
            <p className="mt-3 text-2xl font-black text-white">{todaysSales.length}</p>
          </SectionCard>
          <SectionCard className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Revenue Today
            </p>
            <p className="mt-3 text-xl font-black text-emerald-400">
              {formatCDF(revenueToday)}
            </p>
          </SectionCard>
          <SectionCard className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Items Sold
            </p>
            <p className="mt-3 text-2xl font-black text-white">{itemsSoldToday}</p>
          </SectionCard>
          <SectionCard className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Pending Supplier Orders
            </p>
            <p className="mt-3 text-2xl font-black text-white">
              {loadingOrders ? "..." : pendingSupplierOrders}
            </p>
          </SectionCard>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-white">My Stock</h2>
          {shopInventory.length === 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              No boutique stock tracked yet.
            </SectionCard>
          ) : (
            shopInventory.slice(0, 3).map((item) => (
              <SectionCard key={item.product_id ?? item.name} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-400">Boutique stock</p>
                  </div>
                  <p className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-1 text-sm font-black text-slate-200">
                    {new Intl.NumberFormat("fr-CD").format(getNumber(item.quantity))}
                  </p>
                </div>
              </SectionCard>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Recent Sales</h2>
          {sales.length === 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              No shop sales recorded yet.
            </SectionCard>
          ) : (
            sales.slice(0, 4).map((sale) => (
              <SectionCard key={sale.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">
                      {sale.product_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {sale.quantity} sold - {sale.payment_method}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-emerald-400">
                      {formatCDF(sale.total)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatSaleTime(sale.created_at)}
                    </p>
                  </div>
                </div>
              </SectionCard>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Top Products</h2>
          {topProducts.length === 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              Top products will appear after sales are recorded.
            </SectionCard>
          ) : (
            topProducts.map((product) => (
              <SectionCard key={product.name} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {product.quantity} items sold
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-black text-emerald-400">
                    {formatCDF(product.revenue)}
                  </p>
                </div>
              </SectionCard>
            ))
          )}
        </section>
      </main>
    </MobilePageShell>
  );
}
