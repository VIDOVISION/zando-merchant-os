"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  MobilePageShell,
  SectionCard,
} from "@/components/mobile-prototype/components";
import { ShopNavigation } from "../_components/ShopNavigation";
import { createClient } from "@/lib/supabase/client";
import { formatCDF, getNumber } from "@/lib/zando-format";
import {
  addShopSale,
  type ZandoShopSalePaymentMethod,
} from "@/lib/zando-shop-sales";

const paymentMethods: ZandoShopSalePaymentMethod[] = ["Cash", "Mobile Money", "Credit"];

interface InventoryProductSuggestion {
  id: string;
  name: string;
  category: string | null;
  selling_price: number | string | null;
  unit_price: number | string | null;
}

function getSuggestionPrice(product: InventoryProductSuggestion): number {
  const unitPrice = getNumber(product.unit_price);
  return unitPrice > 0 ? unitPrice : getNumber(product.selling_price);
}

export default function MobileShopAddSalePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProductSuggestion[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ZandoShopSalePaymentMethod>("Cash");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInventoryProducts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      const { data, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, name, category, selling_price, unit_price")
        .eq("merchant_id", user.id)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (!inventoryError) {
        setInventoryProducts((data as InventoryProductSuggestion[] | null) ?? []);
      }
    }

    void loadInventoryProducts();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const saleTotal = useMemo(() => {
    return Math.max(0, Math.floor(getNumber(quantity))) * Math.max(0, getNumber(sellingPrice));
  }, [quantity, sellingPrice]);

  const productSuggestions = useMemo(() => {
    const normalizedQuery = productName.trim().toLowerCase();
    if (!normalizedQuery || !suggestionsOpen) return [];

    return inventoryProducts
      .filter((product) =>
        `${product.name} ${product.category ?? ""}`.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6);
  }, [inventoryProducts, productName, suggestionsOpen]);

  function handleProductInput(value: string) {
    setProductName(value);
    setSelectedProductId(null);
    setSuggestionsOpen(true);
    setError(null);
  }

  function selectProductSuggestion(product: InventoryProductSuggestion) {
    const price = getSuggestionPrice(product);
    setProductName(product.name);
    setSelectedProductId(product.id);
    setSuggestionsOpen(false);

    if (price > 0) {
      setSellingPrice(String(price));
    }
  }

  function saveSale() {
    const trimmedProductName = productName.trim();
    const saleQuantity = Math.floor(getNumber(quantity));
    const price = getNumber(sellingPrice);

    if (!trimmedProductName) {
      setError("Product name is required.");
      return;
    }

    if (saleQuantity <= 0) {
      setError("Quantity must be at least 1.");
      return;
    }

    if (price <= 0) {
      setError("Selling price is required.");
      return;
    }

    addShopSale({
      id: `shop-sale-${crypto.randomUUID()}`,
      product_id: selectedProductId ?? undefined,
      product_name: trimmedProductName,
      quantity: saleQuantity,
      selling_price: price,
      total: saleQuantity * price,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
    });

    router.push("/mobile-shop-dashboard?saleSaved=1");
  }

  return (
    <MobilePageShell active="dashboard" hideBottomNav>
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/mobile-shop-dashboard"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
          aria-label="Back to shop dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-lg font-black text-white">Add Sale</p>
          <p className="text-xs text-slate-500">Patrice Mini Market</p>
        </div>
        <Link
          href="/mobile-role-select"
          className="flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-sm font-black text-slate-200"
        >
          Role
        </Link>
      </header>

      <main className="mt-8 space-y-4 pb-28">
        <ShopNavigation />

        <section>
          <h1 className="text-3xl font-black text-white">Record shop sale</h1>
          <p className="mt-2 text-base text-slate-300">
            Track what your boutique sells to final customers.
          </p>
        </section>

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
            {error}
          </SectionCard>
        ) : null}

        <SectionCard className="p-4">
          <label className="relative block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Product
            </span>
            <input
              value={productName}
              onChange={(event) => handleProductInput(event.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSuggestionsOpen(false);
              }}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              placeholder="Coca-Cola 50cl"
              autoComplete="off"
            />

            {productSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#07111c] shadow-2xl shadow-black/40">
                {productSuggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectProductSuggestion(product)}
                    className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-white">
                        {product.name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                        {product.category ?? "General"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-black text-emerald-300">
                      {formatCDF(getSuggestionPrice(product))}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Quantity
            </span>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Selling price
            </span>
            <input
              type="number"
              min="0"
              value={sellingPrice}
              onChange={(event) => setSellingPrice(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              placeholder="2500"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Payment method
            </span>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as ZandoShopSalePaymentMethod)
              }
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none focus:border-blue-400/40"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
        </SectionCard>

        <SectionCard className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-400">Sale total</span>
            <span className="text-2xl font-black text-emerald-400">
              {formatCDF(saleTotal)}
            </span>
          </div>
          <button
            type="button"
            onClick={saveSale}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
          >
            Save Sale
          </button>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
