"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MobilePageShell,
  SectionCard,
  StatCard,
  StatusBadge,
  StatusTabs,
  TopHeader,
} from "@/components/mobile-prototype/components";
import type { MobileStat } from "@/components/mobile-prototype/mock-data";

type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";
type CategoryTabLabel = "All" | "Beers" | "Soft Drinks" | "Water" | "Juices" | "Energy";
type StockFilter = "All" | InventoryStatus;
type SortOption = "Name" | "Stock" | "Price";

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
  unitPriceValue: number;
  image: string;
  isMock?: boolean;
}

interface EditProductForm {
  name: string;
  category: string;
  stockQuantity: string;
  sellingPrice: string;
  unitPrice: string;
}

const categoryTabs: Array<{ label: CategoryTabLabel }> = [
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
    unitPriceValue: 18000,
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
    unitPriceValue: 24000,
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
    unitPriceValue: 22000,
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
    unitPriceValue: 17000,
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
    unitPriceValue: 21000,
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
    unitPriceValue: 8000,
    image: "/product-icons/vitalo-50cl.webp",
    isMock: true,
  },
];

function getInventoryStatus(stockQuantity: number): InventoryStatus {
  if (stockQuantity === 0) return "Out of Stock";
  if (stockQuantity <= 10) return "Low Stock";
  return "In Stock";
}

function productFilterText(product: Product): string {
  return `${product.name} ${product.category}`.toLowerCase();
}

function matchesCategory(product: Product, category: CategoryTabLabel): boolean {
  if (category === "All") return true;

  const text = productFilterText(product);

  if (category === "Beers") {
    return /\bbeer\b|\bbeers\b|\blager\b|heineken|nkoyi|castel|tembo|beaufort/.test(text);
  }

  if (category === "Soft Drinks") {
    return /soft drink|soft drinks|soda|fanta|coca|sprite|vitalo/.test(text);
  }

  if (category === "Water") return /water|eau|vitalo/.test(text);
  if (category === "Juices") return /juice|jus/.test(text);
  if (category === "Energy") return /energy|energi|booster|red bull/.test(text);

  return false;
}

function sortProducts(products: Product[], sortBy: SortOption): Product[] {
  return [...products].sort((firstProduct, secondProduct) => {
    if (sortBy === "Stock") return firstProduct.stockQuantity - secondProduct.stockQuantity;
    if (sortBy === "Price") return secondProduct.priceValue - firstProduct.priceValue;
    return firstProduct.name.localeCompare(secondProduct.name);
  });
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
    unitPriceValue: row.unit_price || 0,
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
      helper: "Package stock value",
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

function InventorySearchFilterBar({
  filterActive,
  onClearSearch,
  onOpenFilters,
  onSearchChange,
  searchQuery,
}: {
  filterActive: boolean;
  onClearSearch: () => void;
  onOpenFilters: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <label className="relative block">
        <span className="sr-only">Search product...</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search product..."
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-11 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-slate-300"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      <button
        type="button"
        onClick={onOpenFilters}
        className={`flex h-14 items-center gap-2 rounded-2xl border px-4 text-sm font-medium ${
          filterActive
            ? "border-blue-400/30 bg-blue-600/15 text-blue-300"
            : "border-white/10 bg-white/[0.035] text-slate-200"
        }`}
      >
        <SlidersHorizontal className="h-5 w-5" />
        <span className="hidden min-[390px]:inline">Filters</span>
      </button>
    </div>
  );
}

function InventoryProductCard({
  product,
  onEdit,
  onStockChange,
}: {
  product: Product;
  onEdit: (product: Product) => void;
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Stock packages
              </p>
              <p className={`mt-2 text-sm font-bold ${statusTextClass(status)}`}>
                {product.stockQuantity} {product.unitLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Package price
              </p>
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
              onClick={() => onEdit(product)}
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

function EditProductSheet({
  error,
  form,
  onCancel,
  onChange,
  onSave,
  product,
  saving,
}: {
  error: string | null;
  form: EditProductForm;
  onCancel: () => void;
  onChange: (field: keyof EditProductForm, value: string) => void;
  onSave: () => void;
  product: Product;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[1.75rem] border border-white/10 bg-[#07111c] p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Edit Product</h2>
            <p className="mt-1 text-sm text-slate-400">{product.name}</p>
          </div>
          <StatusBadge status={getInventoryStatus(Number(form.stockQuantity) || 0)} />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Product name
            </span>
            <input
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Category
            </span>
            <input
              value={form.category}
              onChange={(event) => onChange("category", event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Stock packages
              </span>
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(event) => onChange("stockQuantity", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              />
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                Counts sellable packages, for example crates or cartons.
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Unit / package
              </span>
              <input
                value={product.unitLabel}
                readOnly
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-semibold text-slate-400 outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Package price
              </span>
              <input
                type="number"
                min="0"
                value={form.sellingPrice}
                onChange={(event) => onChange("sellingPrice", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Single unit price
              </span>
              <input
                type="number"
                min="0"
                value={form.unitPrice}
                onChange={(event) => onChange("unitPrice", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryFilterSheet({
  onCancel,
  onClear,
  onSortChange,
  onStockFilterChange,
  sortBy,
  stockFilter,
}: {
  onCancel: () => void;
  onClear: () => void;
  onSortChange: (sortBy: SortOption) => void;
  onStockFilterChange: (filter: StockFilter) => void;
  sortBy: SortOption;
  stockFilter: StockFilter;
}) {
  const stockOptions: StockFilter[] = ["All", "In Stock", "Low Stock", "Out of Stock"];
  const sortOptions: SortOption[] = ["Name", "Stock", "Price"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[1.75rem] border border-white/10 bg-[#07111c] p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Filters</h2>
            <p className="mt-1 text-sm text-slate-400">Find the stock view you need.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-300"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Stock status
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {stockOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onStockFilterChange(option)}
                  className={`min-h-11 rounded-2xl border px-3 text-sm font-bold ${
                    stockFilter === option
                      ? "border-blue-400/30 bg-blue-600/20 text-blue-200"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Sort by
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSortChange(option)}
                  className={`min-h-11 rounded-2xl border px-3 text-sm font-bold ${
                    sortBy === option
                      ? "border-blue-400/30 bg-blue-600/20 text-blue-200"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClear}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200"
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MobileInventoryPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditProductForm | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryTabLabel>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Name");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (searchParams.get("filter") === "low-stock") {
      setStockFilter("Low Stock");
    }
  }, [searchParams]);

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
  const activeCategoryIndex = categoryTabs.findIndex((tab) => tab.label === activeCategory);
  const hasActiveFilters = stockFilter !== "All" || sortBy !== "Name";
  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredProducts = products.filter((product) => {
      const text = productFilterText(product);
      const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
      const matchesSelectedCategory = matchesCategory(product, activeCategory);
      const status = getInventoryStatus(product.stockQuantity);
      const matchesSelectedStock =
        stockFilter === "All" ||
        (stockFilter === "In Stock" && product.stockQuantity > 0) ||
        (stockFilter !== "In Stock" && status === stockFilter);

      return matchesSearch && matchesSelectedCategory && matchesSelectedStock;
    });

    return sortProducts(filteredProducts, sortBy);
  }, [activeCategory, products, searchQuery, sortBy, stockFilter]);

  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function openEditProduct(product: Product) {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      category: product.category,
      stockQuantity: String(product.stockQuantity),
      sellingPrice: String(product.priceValue),
      unitPrice: String(product.unitPriceValue),
    });
    setEditError(null);
  }

  function closeEditProduct() {
    if (savingEdit) return;
    setSelectedProduct(null);
    setEditForm(null);
    setEditError(null);
  }

  function updateEditForm(field: keyof EditProductForm, value: string) {
    setEditForm((currentForm) => (currentForm ? { ...currentForm, [field]: value } : currentForm));
  }

  function clearFilters() {
    setStockFilter("All");
    setSortBy("Name");
  }

  function parseNonNegativeNumber(value: string): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  }

  async function saveEditedProduct() {
    if (!selectedProduct || !editForm) return;

    const name = editForm.name.trim();
    const category = editForm.category.trim();
    const stockQuantity = parseNonNegativeNumber(editForm.stockQuantity);
    const sellingPrice = parseNonNegativeNumber(editForm.sellingPrice);
    const unitPrice = parseNonNegativeNumber(editForm.unitPrice);

    if (!name) {
      setEditError("Product name cannot be empty.");
      return;
    }

    if (stockQuantity === null || sellingPrice === null || unitPrice === null) {
      setEditError("Stock packages and prices must be 0 or more.");
      return;
    }

    const roundedStock = Math.floor(stockQuantity);
    const roundedSellingPrice = Math.round(sellingPrice);
    const roundedUnitPrice = Math.round(unitPrice);

    if (selectedProduct.isMock) {
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                category,
                image: getProductImage(name),
                name,
                priceValue: roundedSellingPrice,
                stockQuantity: roundedStock,
                unitPriceValue: roundedUnitPrice,
              }
            : product
        )
      );
      setSuccessMessage("Product updated");
      closeEditProduct();
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    setError(null);

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        category,
        name,
        selling_price: roundedSellingPrice,
        stock_on_hand: roundedStock,
        unit_price: roundedUnitPrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedProduct.id);

    if (updateError) {
      setEditError("Could not update product");
      setSavingEdit(false);
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === selectedProduct.id
          ? {
              ...product,
              category,
              image: getProductImage(name),
              name,
              priceValue: roundedSellingPrice,
              stockQuantity: roundedStock,
              unitPriceValue: roundedUnitPrice,
            }
          : product
      )
    );
    setSuccessMessage("Product updated");
    setSavingEdit(false);
    setSelectedProduct(null);
    setEditForm(null);
  }

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
            Manage sellable packages, prices and product availability.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <InventorySearchFilterBar
          filterActive={hasActiveFilters}
          onClearSearch={() => setSearchQuery("")}
          onOpenFilters={() => setShowFilters(true)}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
        />
        <StatusTabs
          tabs={categoryTabs}
          activeIndex={activeCategoryIndex}
          onChange={(index) => setActiveCategory(categoryTabs[index]?.label ?? "All")}
        />

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading inventory...
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

        {!loading ? (
          <section className="space-y-3">
            {visibleProducts.map((product) => (
              <InventoryProductCard
                key={product.id}
                product={product}
                onEdit={openEditProduct}
                onStockChange={handleStockChange}
              />
            ))}
            {visibleProducts.length === 0 ? (
              <SectionCard className="p-6 text-center">
                <p className="text-base font-bold text-white">No products found.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Try another search, category or stock filter.
                </p>
              </SectionCard>
            ) : null}
          </section>
        ) : null}
      </main>

      {selectedProduct && editForm ? (
        <EditProductSheet
          error={editError}
          form={editForm}
          onCancel={closeEditProduct}
          onChange={updateEditForm}
          onSave={saveEditedProduct}
          product={selectedProduct}
          saving={savingEdit}
        />
      ) : null}

      {showFilters ? (
        <InventoryFilterSheet
          onCancel={() => setShowFilters(false)}
          onClear={clearFilters}
          onSortChange={setSortBy}
          onStockFilterChange={setStockFilter}
          sortBy={sortBy}
          stockFilter={stockFilter}
        />
      ) : null}
    </MobilePageShell>
  );
}
