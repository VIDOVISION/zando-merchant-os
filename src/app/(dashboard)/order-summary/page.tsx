"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type CartDraftIntent,
  getDraftIntentDescription,
  getDraftIntentLabel,
  useCart,
} from "@/components/cart/CartContext";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import {
  formatCdf,
  getMerchantOrderSourceLabel,
  getMerchantOrderStatusDescription,
  getMerchantOrderStatusLabel,
} from "@/lib/merchant-data";

function getOrderSourceDetailFromDraftIntent(draftIntent: CartDraftIntent) {
  if (draftIntent === "low-stock-restock") {
    return "low-stock-reorder" as const;
  }

  if (draftIntent === "inventory-restock") {
    return "inventory-restock" as const;
  }

  if (
    draftIntent === "repeat-saved-basket" ||
    draftIntent === "order-history-restock"
  ) {
    return "saved-basket-reload" as const;
  }

  return "manual-new-order" as const;
}

function getSupplierLabel(
  supplierNames: string[],
  fallbackSupplierName?: string
): string {
  if (supplierNames.length === 1) {
    return supplierNames[0];
  }

  if (supplierNames.length > 1) {
    return `${supplierNames.length} suppliers in this basket`;
  }

  return fallbackSupplierName ?? "Supplier will be set from selected items";
}

export default function OrderSummaryPage() {
  const {
    items,
    draftSource,
    draftOrderId,
    draftIntent,
    removeItem,
    totalItems,
    totalAmount,
    updateQty,
    clearCart,
  } = useCart();
  const { createOrders, orders, syncDraftOrder } = useMerchantData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdReferences, setCreatedReferences] = useState<string[]>([]);
  const currentDraftOrder =
    draftOrderId != null
      ? orders.find((order) => order.id === draftOrderId) ?? null
      : null;
  const supplierNames = Array.from(new Set(items.map((item) => item.supplier)));
  const supplierLabel = getSupplierLabel(
    supplierNames,
    currentDraftOrder?.supplierName
  );
  const sourceLabel = currentDraftOrder
    ? getMerchantOrderSourceLabel(currentDraftOrder)
    : getDraftIntentLabel(draftIntent);
  const draftStatusLabel = currentDraftOrder
    ? getMerchantOrderStatusLabel(currentDraftOrder.status)
    : "Draft in progress";
  const draftStatusDescription = currentDraftOrder
    ? getMerchantOrderStatusDescription(currentDraftOrder.status)
    : "This basket is still editable and has not yet been sent to the supplier.";

  useEffect(() => {
    if (
      currentDraftOrder &&
      !address &&
      currentDraftOrder.deliveryAddress !== "Delivery details pending"
    ) {
      setAddress(currentDraftOrder.deliveryAddress);
    }

    if (currentDraftOrder?.notes && !notes) {
      setNotes(currentDraftOrder.notes);
    }
  }, [address, currentDraftOrder, notes]);

  useEffect(() => {
    if (!draftOrderId || currentDraftOrder?.status !== "Draft") {
      return;
    }

    void syncDraftOrder({ draftOrderId, items }).catch((error) => {
      console.error("Unable to sync draft order", error);
    });
  }, [currentDraftOrder?.status, draftOrderId, items, syncDraftOrder]);

  async function handleConfirm() {
    if (!address.trim()) {
      setError("Please enter a delivery address for this order.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const createdOrders = await createOrders({
        items,
        deliveryAddress: address.trim(),
        notes: notes.trim() || undefined,
        source: draftSource,
        sourceDetail: getOrderSourceDetailFromDraftIntent(draftIntent),
        draftOrderId,
      });

      setCreatedReferences(createdOrders.map((order) => order.reference));
      clearCart();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to confirm the order right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdReferences.length > 0) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Order Confirmed
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Your supplier orders are now live
          </h1>
          <p className="mt-2 text-sm text-secondary">
            The new orders already appear in Orders, and Home has already
            updated with the latest activity.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
            <svg
              className="h-7 w-7 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>

          <p className="mt-5 text-lg font-semibold text-primary">
            Created {createdReferences.length} purchase order
            {createdReferences.length === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-secondary">
            {createdReferences.join(", ")}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/orders"
              className="accent-gradient btn-shine rounded-xl px-5 py-2.5 text-sm font-medium text-background"
            >
              Open Orders
            </Link>
            <Link
              href="/home"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Review and confirm
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Your order draft is empty
          </h1>
        </div>

        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-sm text-secondary">
            Add products from the catalogue before confirming an order.
          </p>
          <Link
            href="/orders/new"
            className="mt-4 inline-block rounded-xl border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Back to draft
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/orders/new"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:border-accent/30 hover:text-primary"
          aria-label="Back to catalogue"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </Link>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Review and confirm
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-gradient">
            Confirm delivery details and submit
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {getDraftIntentDescription(draftIntent)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {sourceLabel}
          </span>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
            {draftStatusLabel}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
            Ready to confirm
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
            <p className="mt-2 text-lg font-semibold text-primary">
              {items.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Units</p>
            <p className="mt-2 text-lg font-semibold text-primary">
              {totalItems}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Basket total</p>
            <p className="mt-2 text-lg font-semibold text-accent">
              {formatCdf(totalAmount)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-secondary">
          {currentDraftOrder
            ? `${currentDraftOrder.reference} is already saved in Orders. ${draftStatusDescription} You can still change quantities or remove lines before confirming.`
            : `${draftStatusDescription} It will only become a live order after you confirm below.`}
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Basket review
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Check quantities, remove anything you do not want, then confirm the
            basket when it is ready to send.
          </p>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">{item.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.supplier}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-secondary">
                  <span>Unit price {formatCdf(item.unit_price)}</span>
                  <span>{item.min_order}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm text-secondary transition-colors hover:border-accent hover:text-accent"
                    aria-label={`Decrease quantity for ${item.name}`}
                  >
                    -
                  </button>
                  <span className="min-w-[3rem] rounded-lg border border-border bg-surface px-3 py-1.5 text-center text-sm font-medium text-primary">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm text-secondary transition-colors hover:border-accent hover:text-accent"
                    aria-label={`Increase quantity for ${item.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    Remove
                  </button>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    Line total
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {formatCdf(item.unit_price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-surface-bright px-5 py-4">
          <span className="text-sm font-semibold text-primary">Total</span>
          <span className="font-heading text-2xl font-bold text-accent">
            {formatCdf(totalAmount)}
          </span>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Delivery details
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="address"
              className="block text-xs font-medium uppercase tracking-[0.18em] text-muted"
            >
              Delivery address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Avenue Kianza 18, Quartier 3, Masina, Kinshasa"
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-medium uppercase tracking-[0.18em] text-muted"
            >
              Delivery notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for suppliers, receiving team, or preferred handoff time."
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSubmitting}
        className="accent-gradient btn-shine w-full rounded-xl py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Confirming order..." : "Confirm order"}
      </button>
    </div>
  );
}
