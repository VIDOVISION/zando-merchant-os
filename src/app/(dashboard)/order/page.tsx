"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  getDraftIntentDescription,
  getDraftIntentLabel,
  useCart,
} from "@/components/cart/CartContext";
import CatalogueGrid from "@/components/catalogue/CatalogueGrid";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import { formatCdf } from "@/lib/merchant-data";

const NEW_ORDER_REVIEW_HREF = "/order-summary";

function getSupplierLabel(
  supplierNames: string[],
  fallbackSupplierName?: string
): string {
  if (supplierNames.length === 1) {
    return supplierNames[0];
  }

  if (supplierNames.length > 1) {
    return `${supplierNames.length} suppliers in this draft`;
  }

  return fallbackSupplierName ?? "Choose items to set the supplier";
}

export default function OrderPage() {
  const {
    inventory,
    orders,
    lastSuccessfulOrder,
    buildDraftFromOrder,
    syncDraftOrder,
  } = useMerchantData();
  const {
    items,
    draftSource,
    draftOrderId,
    draftIntent,
    setCartItems,
    removeItem,
    updateQty,
    totalAmount,
    totalItems,
  } = useCart();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const categories = [
    "All",
    ...Array.from(new Set(inventory.map((product) => product.category))),
  ];

  const filteredProducts = inventory.filter((product) => {
    const matchesSearch =
      deferredSearch.length === 0 ||
      [product.name, product.supplier, product.neighborhood]
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch);
    const matchesCategory =
      categoryFilter === "All" || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  function handleLoadLastSupplierBasket() {
    if (!lastSuccessfulOrder) return;
    setCartItems(
      buildDraftFromOrder(lastSuccessfulOrder.id),
      "replace",
      "Orders",
      null,
      "repeat-saved-basket"
    );
  }

  const currentDraftOrder =
    draftOrderId != null
      ? orders.find((order) => order.id === draftOrderId) ?? null
      : null;
  const supplierNames = Array.from(new Set(items.map((item) => item.supplier)));
  const supplierLabel = getSupplierLabel(
    supplierNames,
    currentDraftOrder?.supplierName
  );
  const draftIntentLabel = getDraftIntentLabel(draftIntent);
  const draftIntentDescription = getDraftIntentDescription(draftIntent);
  const draftStatusLabel = currentDraftOrder ? "Saved draft" : "Draft in progress";
  const draftStatusCopy = currentDraftOrder
    ? `${currentDraftOrder.reference} is already saved in Orders, but it has not been confirmed or sent yet.`
    : "This basket is still being prepared here and will only appear in Orders after you review and confirm it.";

  useEffect(() => {
    if (!draftOrderId || currentDraftOrder?.status !== "Draft") {
      return;
    }

    void syncDraftOrder({ draftOrderId, items }).catch((error) => {
      console.error("Unable to sync draft order", error);
    });
  }, [currentDraftOrder?.status, draftOrderId, items, syncDraftOrder]);

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-2xl border border-accent/20 bg-accent/5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {draftIntentLabel}
          </span>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
            {draftStatusLabel}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
            Editable before confirmation
          </span>
          {currentDraftOrder ? (
            <span className="rounded-full border border-border px-2.5 py-1 font-mono text-xs font-medium text-primary">
              {currentDraftOrder.reference}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Supplier</p>
            <p className="mt-2 text-sm font-medium text-primary">
              {supplierLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Line items</p>
            <p className="mt-2 font-heading text-3xl font-bold text-primary">
              {items.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Units in draft</p>
            <p className="mt-2 font-heading text-3xl font-bold text-primary">
              {totalItems}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Draft value</p>
            <p className="mt-2 font-heading text-3xl font-bold text-accent">
              {formatCdf(totalAmount)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-secondary">
          {draftIntentDescription} {draftStatusCopy} You can still adjust
          quantities or remove items before you review and confirm.
        </p>
      </section>

      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            New supplier order
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Build and edit the supplier basket before you send it
          </h1>
          <p className="mt-2 text-sm text-secondary">
            This is the working draft for your shop in the DRC catalogue. Add
            products, change quantities, then review and confirm when the basket
            is ready.
          </p>
        </div>

        <div className="glass-card w-full max-w-md rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Draft basket
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-primary">
                {draftStatusLabel}
              </h2>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
              Not yet sent
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Supplier</p>
                <p className="mt-1 text-sm font-medium text-primary">
                  {supplierLabel}
                </p>
              </div>
              {currentDraftOrder ? (
                <div className="text-right">
                  <p className="text-xs text-muted">Draft ref</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-primary">
                    {currentDraftOrder.reference}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Lines
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {items.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Units
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {totalItems}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Total
                </p>
                <p className="mt-1 text-lg font-semibold text-accent">
                  {formatCdf(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary">Draft line items</p>
              <p className="text-xs text-muted">
                Change quantities before confirmation
              </p>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-primary">No items in this draft yet.</p>
                <p className="mt-1 text-xs text-muted">
                  Add products from the catalogue or load a saved supplier basket.
                </p>
              </div>
            ) : (
              <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {item.supplier}
                        </p>
                        <p className="mt-2 text-xs font-medium text-accent">
                          {formatCdf(item.unit_price * item.quantity)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-bright hover:text-rose-300"
                        aria-label={`Remove ${item.name}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-secondary">
                        Qty {item.quantity} | Min {item.min_order}
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-base text-secondary transition-colors hover:bg-surface-bright hover:text-primary"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-primary">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-base text-secondary transition-colors hover:bg-surface-bright hover:text-primary"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <Link
              href={NEW_ORDER_REVIEW_HREF}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                items.length === 0
                  ? "pointer-events-none border border-border text-muted"
                  : "accent-gradient btn-shine text-background"
              }`}
            >
              Review and confirm
            </Link>
            <button
              type="button"
              onClick={handleLoadLastSupplierBasket}
              disabled={!lastSuccessfulOrder}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load last basket
            </button>
          </div>
        </div>
      </section>

      {lastSuccessfulOrder && (
        <section className="glass-card rounded-2xl p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent/80">
                Saved basket shortcut
              </p>
              <h2 className="mt-1 font-heading text-lg font-semibold text-primary">
                Load {lastSuccessfulOrder.reference} back into this draft
              </h2>
              <p className="mt-1 text-sm text-secondary">
                {lastSuccessfulOrder.supplierName} |{" "}
                {lastSuccessfulOrder.items
                  .map((item) => `${item.name} x${item.quantity}`)
                  .join(" | ")}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLoadLastSupplierBasket}
              className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Load saved basket
            </button>
          </div>
        </section>
      )}

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Catalogue
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Seeded DRC assortment for drinks, staples, pantry goods, and home
              care.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative block min-w-[260px]">
              <span className="sr-only">Search catalogue</span>
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
                placeholder="Search product or supplier..."
                className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = category === categoryFilter;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border text-secondary hover:border-border-bright hover:text-primary"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <CatalogueGrid products={filteredProducts} />
        </div>

        {filteredProducts.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm text-primary">No catalogue items found.</p>
            <p className="mt-1 text-xs text-muted">
              Try another search or reset the category filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
