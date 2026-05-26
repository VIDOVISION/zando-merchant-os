"use client";

import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
} from "@/components/mobile-prototype/components";
import { ShopNavigation } from "../_components/ShopNavigation";
import { createClient } from "@/lib/supabase/client";
import { formatCDF, getNumber } from "@/lib/zando-format";
import {
  getShopCart,
  getShopCartItemsCount,
  getShopCartTotal,
  saveShopCart,
  type ZandoShopCartItem,
} from "@/lib/zando-shop-cart";

type CategoryFilter =
  | "All"
  | "Beers"
  | "Soft Drinks"
  | "Water"
  | "Juices"
  | "Energy"
  | "General";

interface InventoryItemRow {
  id: string;
  name: string;
  category: string | null;
  stock_on_hand: number | string | null;
  selling_price: number | string | null;
  unit_price: number | string | null;
}

const categoryFilters: CategoryFilter[] = [
  "All",
  "Beers",
  "Soft Drinks",
  "Water",
  "Juices",
  "Energy",
  "General",
];

function getProductPrice(product: InventoryItemRow): number {
  return getNumber(product.selling_price || product.unit_price);
}

function getProductStock(product: InventoryItemRow): number {
  return getNumber(product.stock_on_hand);
}

function getProductCategory(product: InventoryItemRow): CategoryFilter {
  const category = product.category?.trim();
  if (
    category === "Beers" ||
    category === "Soft Drinks" ||
    category === "Water" ||
    category === "Juices" ||
    category === "Energy"
  ) {
    return category;
  }

  return "General";
}

function getCartQuantity(cart: ZandoShopCartItem[], productId: string): number {
  return cart.find((item) => item.product_id === productId)?.quantity ?? 0;
}

function ShopHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link
        href="/mobile-shop"
        className="font-heading text-4xl font-black italic tracking-tight text-white"
      >
        Zando
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/mobile-shop-cart"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

export default function MobileShopPage() {
  const [products, setProducts] = useState<InventoryItemRow[]>([]);
  const [cart, setCart] = useState<ZandoShopCartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setCart(getShopCart());
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setProducts([]);
        setError("Could not load products.");
        setLoading(false);
        return;
      }

      const { data, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, name, category, stock_on_hand, selling_price, unit_price")
        .eq("merchant_id", user.id)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (inventoryError) {
        setProducts([]);
        setError("Could not load products.");
      } else {
        setProducts(
          ((data as InventoryItemRow[] | null) ?? []).filter(
            (product) => getProductStock(product) > 0
          )
        );
      }

      setLoading(false);
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || getProductCategory(product) === activeCategory;
      const matchesSearch = normalizedSearch
        ? `${product.name} ${product.category ?? ""}`.toLowerCase().includes(normalizedSearch)
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, searchQuery]);

  const cartItemsCount = getShopCartItemsCount(cart);
  const cartTotal = getShopCartTotal(cart);

  function addToCart(product: InventoryItemRow) {
    const stock = getProductStock(product);
    const price = getProductPrice(product);
    const currentQuantity = getCartQuantity(cart, product.id);

    if (price <= 0) {
      setMessage("Product price is missing.");
      return;
    }

    if (currentQuantity >= stock) {
      setMessage("No more stock available for this product.");
      return;
    }

    const nextCart = [...cart];
    const existingItem = nextCart.find((item) => item.product_id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.total = existingItem.quantity * existingItem.unit_price;
    } else {
      nextCart.push({
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: price,
        total: price,
      });
    }

    setCart(saveShopCart(nextCart));
    setMessage(`${product.name} added to cart`);
  }

  return (
    <MobilePageShell active="dashboard" hideBottomNav>
      <ShopHeader />

      <main className="mt-8 space-y-4 pb-36">
        <section>
          <h1 className="text-3xl font-black text-white">Zando Shop</h1>
          <p className="mt-2 text-base text-slate-300">
            Order products from your supplier.
          </p>
        </section>

        <ShopNavigation />

        <SectionCard className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
            Boutique
          </p>
          <h2 className="mt-3 text-xl font-black text-white">Patrice Mini Market</h2>
          <p className="mt-1 text-sm text-slate-400">Kinshasa</p>
        </SectionCard>

        {message ? (
          <SectionCard className="border-blue-400/20 bg-blue-500/10 p-4 text-sm font-semibold text-blue-100">
            {message}
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
            {error}
          </SectionCard>
        ) : null}

        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products..."
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
          />
        </label>

        <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max rounded-2xl border border-white/10 bg-white/[0.025] p-1">
            {categoryFilters.map((category) => {
              const active = category === activeCategory;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${
                    active ? "bg-blue-600 text-white" : "text-slate-300"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Product catalogue</h2>

          {loading ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              Loading products...
            </SectionCard>
          ) : null}

          {!loading && filteredProducts.length === 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              No available products found.
            </SectionCard>
          ) : null}

          {!loading
            ? filteredProducts.map((product) => (
                <SectionCard key={product.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-white">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {product.category ?? "General"}
                      </p>
                    </div>
                    <p className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-300">
                      {formatCDF(getProductPrice(product))}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-300">
                      {new Intl.NumberFormat("fr-CD").format(getProductStock(product))} available
                    </p>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="min-h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
                    >
                      Add
                    </button>
                  </div>
                </SectionCard>
              ))
            : null}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] border-t border-white/10 bg-[#07111c]/95 px-5 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Cart
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {cartItemsCount} {cartItemsCount === 1 ? "item" : "items"} - {formatCDF(cartTotal)}
            </p>
          </div>
          <Link
            href="/mobile-shop-cart"
            className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
          >
            View Cart
          </Link>
        </div>
      </div>
    </MobilePageShell>
  );
}
