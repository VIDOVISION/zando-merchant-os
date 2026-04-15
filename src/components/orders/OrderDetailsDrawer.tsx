"use client";

import {
  ORDER_STATUS_COLORS,
  formatCdf,
  formatDateTime,
  formatMerchantAddress,
  getMerchantOrderTotalUnits,
  isEditableMerchantOrder,
  isDeliveredMerchantOrder,
  isOnTheWayMerchantOrder,
  isWaitingSupplierMerchantOrder,
  type MerchantOrder,
} from "@/lib/merchant-data";

interface OrderDetailsDrawerProps {
  order: MerchantOrder | null;
  onClose: () => void;
  onReloadBasket?: (orderId: string) => void;
  onReviewAndConfirm?: (orderId: string) => void;
  onResumeDraft?: (orderId: string) => void;
}

function getBasketStateCopy(order: MerchantOrder): {
  label: string;
  detail: string;
} {
  return {
    label: isEditableMerchantOrder(order.status)
      ? "Brouillon enregistré, encore modifiable"
      : getOrdersDrawerStatusLabel(order),
    detail:
      isEditableMerchantOrder(order.status)
        ? "Ce panier est enregistré, pas encore envoyé, et peut encore être modifié avant confirmation."
        : getOrdersDrawerStatusDescription(order),
  };
}

function getOrdersDrawerStatusLabel(order: MerchantOrder): string {
  if (isEditableMerchantOrder(order.status)) {
    return "Brouillon enregistré";
  }

  if (isWaitingSupplierMerchantOrder(order.status)) {
    return "En attente de confirmation fournisseur";
  }

  if (isOnTheWayMerchantOrder(order.status)) {
    return "En route";
  }

  if (isDeliveredMerchantOrder(order.status)) {
    return "Réceptionnée";
  }

  return order.status;
}

function getOrdersDrawerStatusDescription(order: MerchantOrder): string {
  if (isWaitingSupplierMerchantOrder(order.status)) {
    return "Cette commande est déjà envoyée et attend le retour du fournisseur.";
  }

  if (isOnTheWayMerchantOrder(order.status)) {
    return "Cette commande est déjà envoyée et en cours d'acheminement vers la boutique.";
  }

  if (isDeliveredMerchantOrder(order.status)) {
    return "Cette commande a déjà été reçue à la boutique.";
  }

  return "Cette commande a été annulée avant réception.";
}

function getOrdersDrawerSourceLabel(order: MerchantOrder): string {
  if (order.sourceDetail === "saved-basket-reload") {
    return "Ancien panier";
  }

  if (order.sourceDetail === "inventory-restock") {
    return "Réappro stock";
  }

  if (
    order.sourceDetail === "quick-reorder" ||
    order.sourceDetail === "low-stock-reorder"
  ) {
    return "Réappro rapide";
  }

  return "Commande manuelle";
}

export default function OrderDetailsDrawer({
  order,
  onClose,
  onReloadBasket,
  onReviewAndConfirm,
  onResumeDraft,
}: OrderDetailsDrawerProps) {
  if (!order) return null;

  const totalUnits = getMerchantOrderTotalUnits(order);
  const basketState = getBasketStateCopy(order);
  const canResumeDraft = isEditableMerchantOrder(order.status) && onResumeDraft;
  const canReviewAndConfirm =
    isEditableMerchantOrder(order.status) && onReviewAndConfirm;
  const canReuseBasket =
    !isEditableMerchantOrder(order.status) && onReloadBasket;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-semibold text-primary">
                {order.reference}
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-primary">
                {order.supplierName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-bright hover:text-primary"
              aria-label="Fermer le détail de la commande"
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
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                ORDER_STATUS_COLORS[order.status]
              }`}
            >
              {getOrdersDrawerStatusLabel(order)}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
              {getOrdersDrawerSourceLabel(order)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface-bright/60 p-4">
              <p className="text-xs text-muted">Date de commande</p>
              <p className="mt-2 text-sm font-medium text-primary">
                {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-bright/60 p-4">
              <p className="text-xs text-muted">Arrivée prévue</p>
              <p className="mt-2 text-sm font-medium text-primary">
                {order.deliveryDate}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-bright/60 p-4">
              <p className="text-xs text-muted">Montant</p>
              <p className="mt-2 text-sm font-medium text-accent">
                {formatCdf(order.totalAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-bright/60 p-4">
              <p className="text-xs text-muted">Lignes</p>
              <p className="mt-2 text-sm font-medium text-primary">
                {order.items.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-bright/60 p-4">
              <p className="text-xs text-muted">Total unités</p>
              <p className="mt-2 text-sm font-medium text-primary">
                {totalUnits}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-accent/15 bg-accent/5 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              État du panier
            </p>
            <p className="mt-2 text-sm font-medium text-primary">
              {basketState.label}
            </p>
            <p className="mt-2 text-xs leading-5 text-secondary">
              {basketState.detail}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border border-border bg-surface-bright/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Contenu du panier
            </p>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={`${order.id}-${item.productId}`}
                  className="rounded-2xl border border-border bg-surface/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Qté {item.quantity} | Unité {formatCdf(item.unitPrice)} |{" "}
                        {item.packSize}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                    <span className="text-muted">Total ligne</span>
                    <span className="text-sm font-semibold text-primary">
                      {formatCdf(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface-bright/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Livraison
            </p>
            <p className="mt-2 text-sm text-secondary">
              {formatMerchantAddress(order.deliveryAddress)}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-border px-5 py-4">
          {canResumeDraft ? (
            <button
              type="button"
              onClick={() => onResumeDraft(order.id)}
              className="accent-gradient btn-shine w-full rounded-xl py-2.5 text-sm font-medium text-background"
            >
              Continuer la modification
            </button>
          ) : null}
          {canReviewAndConfirm ? (
            <button
              type="button"
              onClick={() => onReviewAndConfirm(order.id)}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
            >
              Vérifier et confirmer
            </button>
          ) : null}
          {canReuseBasket ? (
            <button
              type="button"
              onClick={() => onReloadBasket(order.id)}
              className="accent-gradient btn-shine w-full rounded-xl py-2.5 text-sm font-medium text-background"
            >
              Relancer le panier
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
