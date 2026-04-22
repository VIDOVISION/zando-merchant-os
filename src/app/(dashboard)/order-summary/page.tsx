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

function isUnsetDeliveryAddress(value: string | undefined): boolean {
  const normalizedValue = value?.trim() ?? "";

  return (
    normalizedValue.length === 0 ||
    normalizedValue === "Delivery details pending" ||
    normalizedValue === "Adresse de livraison à renseigner"
  );
}

function getSupplierLabel(
  supplierNames: string[],
  fallbackSupplierName?: string
): string {
  if (supplierNames.length === 1) {
    return supplierNames[0];
  }

  if (supplierNames.length > 1) {
    return `${supplierNames.length} fournisseurs dans ce panier`;
  }

  return fallbackSupplierName ?? "Le fournisseur sera défini à partir des articles sélectionnés";
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
    : "Brouillon en cours";
  const draftStatusDescription = currentDraftOrder
    ? getMerchantOrderStatusDescription(currentDraftOrder.status)
    : "Ce brouillon est encore modifiable et n'a pas encore été envoyé au fournisseur.";

  useEffect(() => {
    if (!currentDraftOrder) {
      return;
    }

    setAddress(
      isUnsetDeliveryAddress(currentDraftOrder.deliveryAddress)
        ? ""
        : currentDraftOrder.deliveryAddress
    );
    setNotes(currentDraftOrder.notes ?? "");
  }, [currentDraftOrder?.id]);

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
      setError("Saisissez une adresse de livraison pour cette commande.");
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
          : "Impossible de confirmer la commande pour le moment."
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
            Commande confirmée
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Vos commandes fournisseur sont bien enregistrées
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Les nouvelles commandes apparaissent déjà dans Commandes et
            l'accueil a été mis à jour avec la dernière activité.
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
            {createdReferences.length === 1
              ? "1 commande fournisseur créée"
              : `${createdReferences.length} commandes fournisseur créées`}
          </p>
          <p className="mt-2 text-sm text-secondary">
            {createdReferences.join(", ")}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/orders"
              className="accent-gradient btn-shine rounded-xl px-5 py-2.5 text-sm font-medium text-background"
            >
              Ouvrir les commandes
            </Link>
            <Link
              href="/home"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
            >
              Retour à l'accueil
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
            Vérifier et confirmer
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Votre brouillon est vide
          </h1>
        </div>

        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-sm text-secondary">
            Ajoutez des produits depuis le catalogue avant de confirmer une commande.
          </p>
          <Link
            href="/orders/new"
            className="mt-4 inline-block rounded-xl border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Retour au brouillon
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
          aria-label="Retour au brouillon"
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
            Vérifier et confirmer
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-gradient">
            Confirmez la livraison puis envoyez la commande
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
            Prêt à confirmer
          </span>
          {currentDraftOrder ? (
            <span className="rounded-full border border-border px-2.5 py-1 font-mono text-xs font-medium text-primary">
              {currentDraftOrder.reference}
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Fournisseur</p>
            <p className="mt-2 text-sm font-medium text-primary">
              {supplierLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Lignes</p>
            <p className="mt-2 text-lg font-semibold text-primary">
              {items.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Unités</p>
            <p className="mt-2 text-lg font-semibold text-primary">
              {totalItems}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-4">
            <p className="text-xs text-muted">Total du panier</p>
            <p className="mt-2 text-lg font-semibold text-accent">
              {formatCdf(totalAmount)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-secondary">
          {currentDraftOrder
            ? `${currentDraftOrder.reference} est déjà enregistré dans Commandes. ${draftStatusDescription} Vous pouvez encore modifier les quantités ou retirer des lignes avant de confirmer.`
            : `${draftStatusDescription} Il ne deviendra une commande active qu'après confirmation ci-dessous.`}
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Vérification du panier
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Vérifiez les quantités, retirez ce qu'il faut, puis confirmez le
            panier quand il est prêt à être envoyé.
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
                  <span>Prix unitaire {formatCdf(item.unit_price)}</span>
                  <span>Minimum {item.min_order}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm text-secondary transition-colors hover:border-accent hover:text-accent"
                    aria-label={`Réduire la quantité de ${item.name}`}
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
                    aria-label={`Augmenter la quantité de ${item.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    Retirer
                  </button>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    Total ligne
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
          Détails de livraison
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="address"
              className="block text-xs font-medium uppercase tracking-[0.18em] text-muted"
            >
              Adresse de livraison
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ex. 1250 avenue Kianza, Masina"
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-medium uppercase tracking-[0.18em] text-muted"
            >
              Notes de livraison
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Note optionnelle pour le fournisseur, la réception ou l'horaire souhaité."
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
        {isSubmitting ? "Confirmation en cours..." : "Confirmer la commande"}
      </button>
    </div>
  );
}
