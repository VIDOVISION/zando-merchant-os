"use client";

import { useRouter } from "next/navigation";
import { formatCdf } from "@/lib/merchant-data";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import {
  getDraftIntentDescription,
  getDraftIntentLabel,
  useCart,
} from "./CartContext";

function getSupplierLabel(items: Array<{ supplier: string }>): string {
  const supplierNames = Array.from(new Set(items.map((item) => item.supplier)));

  if (supplierNames.length === 1) {
    return supplierNames[0];
  }

  if (supplierNames.length > 1) {
    return `${supplierNames.length} fournisseurs dans ce brouillon`;
  }

  return "Ajoutez des articles pour définir le fournisseur";
}

export default function CartDrawer() {
  const {
    items,
    draftOrderId,
    draftIntent,
    removeItem,
    updateQty,
    totalAmount,
    totalItems,
    isOpen,
    closeCart,
  } = useCart();
  const { orders } = useMerchantData();
  const router = useRouter();

  if (!isOpen) return null;

  const currentDraftOrder =
    draftOrderId != null
      ? orders.find((order) => order.id === draftOrderId) ?? null
      : null;
  const supplierLabel = getSupplierLabel(items);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-semibold text-primary">
                Brouillon fournisseur
              </h2>
              <p className="mt-1 text-xs text-secondary">
                {getDraftIntentLabel(draftIntent)}
              </p>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-bright hover:text-primary"
              aria-label="Fermer le brouillon"
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

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
              {currentDraftOrder ? "Brouillon enregistré" : "Brouillon en cours"}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted">
              Modifiable avant confirmation
            </span>
            {currentDraftOrder ? (
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs font-medium text-primary">
                {currentDraftOrder.reference}
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface-bright/60 p-4">
            <p className="text-xs text-muted">Fournisseur</p>
            <p className="mt-1 text-sm font-medium text-primary">
              {supplierLabel}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Lignes
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {items.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Unités
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

          <p className="mt-3 text-xs text-muted">
            {getDraftIntentDescription(draftIntent)}
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <svg
                className="mb-3 h-10 w-10 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
              <p className="text-sm text-secondary">Votre brouillon est vide.</p>
              <p className="mt-1 text-xs text-muted">
                Ajoutez des articles du catalogue ou relancez un ancien panier fournisseur.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{item.supplier}</p>
                    <p className="mt-1 text-xs font-medium text-accent">
                      {formatCdf(item.unit_price * item.quantity)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-bright hover:text-rose-300"
                    aria-label={`Retirer ${item.name}`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
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

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-secondary">
                    Qté {item.quantity} | Minimum {item.min_order}
                  </p>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-base text-secondary transition-colors hover:border-accent hover:text-accent"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-primary">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-base text-secondary transition-colors hover:border-accent hover:text-accent"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Total du brouillon</span>
              <span className="font-heading text-lg font-bold text-primary">
                {formatCdf(totalAmount)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                closeCart();
                router.push("/order-summary");
              }}
              className="accent-gradient btn-shine w-full rounded-xl py-3 text-sm font-medium text-background"
            >
              Vérifier et confirmer
            </button>
          </div>
        )}
      </div>
    </>
  );
}
