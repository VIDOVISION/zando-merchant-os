"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MobilePageShell,
  SearchFilterBar,
  SectionCard,
  StatCard,
  StatusBadge,
  StatusTabs,
  TopHeader,
} from "@/components/mobile-prototype/components";
import type { MobileStat } from "@/components/mobile-prototype/mock-data";

type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";

interface InventoryItemRow {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  selling_price: number;
  pack_size: string;
  stock_on_hand: number;
  reorder_point: number;
  is_active?: boolean;
}

interface Product {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  unitLabel: string;
  priceValue: number;
  image: string;
  isMock?: boolean;
}

const categoryTabs = [
  { label: "All" },
  { label: "Beers" },
  { label: "Soft Drinks" },
  { label: "Water" },
  { label: "Juices" },
  { label: "Energy" },
];

const fallbackProducts: Product[] = [
  {
    id: "mock-coca-cola-case",
    name: "Coca-Cola Case",
    category: "Soft Drinks",
    stockQuantity: 54,
    unitLabel: "cases",
    priceValue: 18000,
    image: "/products/coca-cola-case.png",
    isMock: true,
  },
  {
    id: "mock-heineken-case",
    name: "Heineken 33cl",
    category: "Beers",
    stockQuantity: 31,
    unitLabel: "cases",
    priceValue: 24000,
    image: "/product-icons/heineken-33cl.webp",
    isMock: true,
  },
  {
    id: "mock-nkoyi-black-case",
    name: "Nkoyi Black 33cl",
    category: "Beers",
    stockQuantity: 18,
    unitLabel: "cases",
    priceValue: 22000,
    image: "/product-icons/nkoyi-black-33cl.webp",
    isMock: true,
  },
  {
    id: "mock-fanta-case",
    name: "Fanta Orange 50cl",
    category: "Soft Drinks",
    stockQuantity: 42,
    unitLabel: "cases",
    priceValue: 17000,
    image: "/product-icons/fanta-orange-50cl.webp",
    isMock: true,
  },
  {
    id: "mock-beaufort-case",
    name: "Beaufort",
    category: "Beers",
    stockQuantity: 8,
    unitLabel: "cases",
    priceValue: 21000,
    image: "/product-icons/beaufort-lager-33cl.webp",
    isMock: true,
  },
  {
    id: "mock-vitalo-water",
    name: "Vitalo Water",
    category: "Water",
    stockQuantity: 0,
    unitLabel: "cases",
    priceValue: 8000,
    image: "/product-icons/vitalo-50cl.webp",
    isMock: true,
  },
];

function getInventoryStatus(stockQuantity: number): InventoryStatus {
  if (stockQuantity === 0) return "Out of Stock";
  if (stockQuantity <= 10) return "Low Stock";
  return "In Stock";
}

function formatCdf(value: number): string {
  return `${new Intl.NumberFormat("fr-CD").format(value)} CDF`;
}

function productInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "P"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getProductImage(name: string): string {
  const normalizedName = normalizeProductName(name);

  if (normalizedName.includes("heineken")) return "/product-icons/heineken-33cl.webp";
  if (normalizedName.includes("vitalo")) return "/product-icons/vitalo-50cl.webp";
  if (normalizedName.includes("nkoyi black")) return "/product-icons/nkoyi-black-33cl.webp";
  if (normalizedName.includes("nkoyi blonde")) return "/product-icons/nkoyi-blonde-33cl.webp";
  if (normalizedName.includes("castel")) return "/product-icons/castel-beer-33cl.webp";
  if (normalizedName.includes("tembo")) return "/product-icons/tembo-33cl.webp";
  if (normalizedName.includes("fanta")) return "/product-icons/fanta-orange-50cl.webp";
  if (normalizedName.includes("beaufort")) return "/product-icons/beaufort-lager-33cl.webp";

  return "";
}

function mapInventoryRowToProduct(row: InventoryItemRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    stockQuantity: row.stock_on_hand,
    unitLabel: row.pack_size || "units",
    priceValue: row.selling_price || row.unit_price || 0,
    image: getProductImage(row.name),
  };
}

function buildInventoryStats(products: Product[]): MobileStat[] {
  const totalProducts = products.length;
  const lowStock = products.filter(
    (product) => getInventoryStatus(product.stockQuantity) === "Low Stock"
  ).length;
  const outOfStock = products.filter(
    (product) => getInventoryStatus(product.stockQuantity) === "Out of Stock"
  ).length;
  const stockValue = products.reduce(
    (total, product) => total + product.stockQuantity * product.priceValue,
    0
  );

  return [
    {
      label: "Total Products",
      value: String(totalProducts),
      helper: "Active catalogue",
      tone: "blue",
      iconName: "package-check",
    },
    {
      label: "Low Stock",
      value: String(lowStock),
      helper: "Need attention",
      tone: "orange",
      iconName: "box",
    },
    {
      label: "Out of Stock",
      value: String(outOfStock),
      helper: "Unavailable",
      tone: "red",
      iconName: "x-circle",
    },
    {
      label: "Stock Value",
      value: formatCdf(stockValue),
      helper: "Estimated value",
      tone: "green",
      iconName: "dollar",
    },
  ];
}

function statusTextClass(status: InventoryStatus): string {
  if (status === "In Stock") return "text-emerald-400";
  if (status === "Low Stock") return "text-orange-400";
  return "text-red-400";
}

function statusBgClass(status: InventoryStatus): string {
  if (status === "In Stock") return "bg-emerald-500/15";
  if (status === "Low Stock") return "bg-orange-500/15";
  return "bg-red-500/15";
}

function InventoryProductImage({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const status = getInventoryStatus(product.stockQuantity);

  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 ${statusBgClass(status)}`}
    >
      {product.image && !imageFailed ? (
        <img
          src={product.image}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain p-2"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={`text-sm font-black ${statusTextClass(status)}`}>
          {productInitials(product.name)}
        </span>
      )}
    </div>
  );
}

function InventoryProductCard({
  product,
  onStockChange,
}: {
  product: Product;
  onStockChange: (productId: string, nextQuantity: number) => void;
}) {
  const status = getInventoryStatus(product.stockQuantity);
  const canDecrease = product.stockQuantity > 0;

  return (
    <SectionCard className="p-4">
      <div className="flex items-start gap-4">
        <InventoryProductImage product={product} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-white">{product.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{product.category}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stock</p>
              <p className={`mt-2 text-sm font-bold ${statusTextClass(status)}`}>
                {product.stockQuantity} {product.unitLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Price</p>
              <p className="mt-2 text-sm font-bold text-white">{formatCdf(product.priceValue)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onStockChange(product.id, product.stockQuantity + 1)}
              className="min-h-11 rounded-2xl bg-blue-600 px-3 text-sm font-bold text-white"
            >
              + Stock
            </button>
            <button
              type="button"
              onClick={() => onStockChange(product.id, Math.max(product.stockQuantity - 1, 0))}
              disabled={!canDecrease}
              className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-sm font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              - Stock
            </button>
            <button
              type="button"
              className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-sm font-bold text-slate-200"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function MobileInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setError("Could not load inventory.");
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error: inventoryError } = await supabase
        .from("inventory_items")
        .select(
          "id, name, category, unit_price, selling_price, pack_size, stock_on_hand, reorder_point, is_active"
        )
        .eq("merchant_id", user.id)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (inventoryError) {
        setError("Could not load inventory.");
        setProducts([]);
        setLoading(false);
        return;
      }

      const rows = ((data as InventoryItemRow[] | null) ?? []).filter(
        (row) => row.is_active !== false
      );

      setProducts(rows.length > 0 ? rows.map(mapInventoryRowToProduct) : fallbackProducts);
      setLoading(false);
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const stats = useMemo(() => buildInventoryStats(products), [products]);

  async function handleStockChange(productId: string, nextQuantity: number) {
    const currentProduct = products.find((product) => product.id === productId);
    if (!currentProduct) return;

    const safeQuantity = Math.max(nextQuantity, 0);
    const previousProducts = products;

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, stockQuantity: safeQuantity } : product
      )
    );

    if (currentProduct.isMock) return;

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_on_hand: safeQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (updateError) {
      setProducts(previousProducts);
      setError("Could not load inventory.");
    }
  }

  return (
    <MobilePageShell active="inventory">
      <TopHeader showSearch />

      <main className="mt-10 space-y-4 pb-32">
        <section>
          <h1 className="text-3xl font-bold text-white">Inventory</h1>
          <p className="mt-2 text-base leading-7 text-slate-300">
            Manage your stock, prices and product availability.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <SearchFilterBar placeholder="Search product..." />
        <StatusTabs tabs={categoryTabs} />

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading inventory...
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Could not load inventory.
          </SectionCard>
        ) : null}

        {!loading ? (
          <section className="space-y-3">
            {products.map((product) => (
              <InventoryProductCard
                key={product.id}
                product={product}
                onStockChange={handleStockChange}
              />
            ))}
          </section>
        ) : null}
      </main>
    </MobilePageShell>
  );
}
