"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import { formatCdf } from "@/lib/merchant-data";

const FILTER_OPTIONS = [
  { id: "all", label: "Tout" },
  { id: "Low Stock", label: "Stock bas" },
  { id: "Out of Stock", label: "Rupture" },
  { id: "Healthy", label: "Stock correct" },
] as const;

type InventoryFilter = (typeof FILTER_OPTIONS)[number]["id"];

const STOCK_STYLES = {
  Healthy: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  "Low Stock": "text-amber-300 bg-amber-500/10 border-amber-500/20",
  "Out of Stock": "text-rose-300 bg-rose-500/10 border-rose-500/20",
} as const;

function getInventoryStatusLabel(
  status: keyof typeof STOCK_STYLES
): string {
  if (status === "Healthy") return "Stock correct";
  if (status === "Low Stock") return "Stock bas";
  return "Rupture";
}

export default function InventoryPage() {
  const router = useRouter();
  const { setCartItems } = useCart();
  const {
    inventory,
    lowStockProducts,
    launchDraftOrder,
    buildDraftFromProduct,
    findProduct,
    activeOrders,
  } = useMerchantData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredProducts = inventory.filter((product) => {
    const matchesSearch =
      deferredSearch.length === 0 ||
      [product.name, product.supplier, product.category, product.neighborhood]
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch);
    const matchesStatus =
      statusFilter === "all" || product.stockStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const outOfStockCount = inventory.filter(
    (product) => product.stockStatus === "Out of Stock"
  ).length;
  const lowStockCount = inventory.filter(
    (product) => product.stockStatus === "Low Stock"
  ).length;
  const healthyCount = inventory.filter(
    (product) => product.stockStatus === "Healthy"
  ).length;
  const unitsOnOrder = inventory.reduce(
    (runningTotal, product) => runningTotal + product.onOrder,
    0
  );

  async function handleReorder(productId: string) {
    try {
      setActionError(null);
      const reorderDraft = buildDraftFromProduct(productId);
      const product = findProduct(productId);
      if (reorderDraft.length === 0) return;

      const draftOrder = await launchDraftOrder({
        items: reorderDraft,
        source: "Inventory",
        reason: "inventory-reorder",
        productName: product?.name,
      });
      if (!draftOrder) return;

      setCartItems(
        reorderDraft,
        "replace",
        "Inventory",
        draftOrder.id,
        "inventory-restock"
      );
      router.push("/orders/new");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir ce brouillon de réappro."
      );
    }
  }

  return (
    <div className="space-y-8">
      {actionError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {actionError}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Stock
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Préparez le réappro avant que les rayons se vident
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            Stock du magasin a Kinshasa avec état des produits, commandes attendues et réappro rapide en CDF.
          </p>
        </div>

        <div className="glass-card flex max-w-xl flex-col gap-3 rounded-2xl p-4 lg:min-w-[360px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Réappro urgent</p>
              <p className="mt-1 text-lg font-semibold text-primary">
                {lowStockProducts.length} produits à suivre
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-right">
              <p className="text-xs text-rose-200">En rupture</p>
              <p className="text-lg font-semibold text-rose-300">
                {outOfStockCount}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 3).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleReorder(product.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface/60 px-3 py-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-bright"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {product.stockOnHand} en stock, réappro {product.reorderQuantity} |{" "}
                    {product.supplier}
                  </p>
                </div>
                <span className="text-xs font-medium text-accent">
                  Préparer
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Stock correct</p>
          <p className="mt-2 font-heading text-3xl font-bold text-emerald-300">
            {healthyCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Produits au-dessus du seuil de réappro
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Stock bas</p>
          <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
            {lowStockCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Réappro à préparer cette semaine
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Rupture</p>
          <p className="mt-2 font-heading text-3xl font-bold text-rose-300">
            {outOfStockCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Risque de ventes perdues sur rayon vide
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Stock attendu</p>
          <p className="mt-2 font-heading text-3xl font-bold text-accent">
            {unitsOnOrder}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Dans {activeOrders.length} brouillons et commandes en cours
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Produits à surveiller
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Recherchez un produit, repérez le risque, et lancez le réappro sans attendre.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative block min-w-[260px]">
              <span className="sr-only">Rechercher dans le stock</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher produit, fournisseur, categorie..."
                className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const active = option.id === statusFilter;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStatusFilter(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border text-secondary hover:border-border-bright hover:text-primary"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Produit
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Fournisseur
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Stock
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  En commande
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Prix
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  État
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-surface-bright/40"
                >
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-primary">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {product.category} | {product.packSize}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="text-secondary">{product.supplier}</p>
                    <p className="mt-1 text-xs text-muted">
                      {product.neighborhood}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-primary">
                      {product.stockOnHand} unités
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Seuil de réappro {product.reorderPoint}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-primary">
                      {product.onOrder} unités
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Réappro conseillé {product.reorderQuantity}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-accent">
                      {formatCdf(product.unitPrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Minimum {product.minOrder}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        STOCK_STYLES[product.stockStatus]
                      }`}
                    >
                      {getInventoryStatusLabel(product.stockStatus)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-right align-top">
                    <button
                      type="button"
                      onClick={() => handleReorder(product.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                        product.stockStatus === "Healthy"
                          ? "border-border text-secondary hover:border-accent/40 hover:text-primary"
                          : "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20"
                      }`}
                    >
                      Préparer le réappro
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-primary">
                Aucun produit ne correspond à cette vue.
              </p>
              <p className="mt-1 text-xs text-muted">
                Essayez une autre recherche ou revenez sur tous les états de stock.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
