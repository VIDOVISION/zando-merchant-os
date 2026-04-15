"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type CartDraftIntent,
  useCart,
} from "@/components/cart/CartContext";
import OrderDetailsDrawer from "@/components/orders/OrderDetailsDrawer";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import {
  ORDER_STATUS_COLORS,
  formatCdf,
  formatDateTime,
  formatMerchantAddress,
  getMerchantOrderItemPreview,
  getMerchantOrderTotalUnits,
  isDeliveredMerchantOrder,
  isEditableMerchantOrder,
  isOnTheWayMerchantOrder,
  isWaitingSupplierMerchantOrder,
  type MerchantOrder,
} from "@/lib/merchant-data";

type OrdersFilter =
  | "all"
  | "drafts"
  | "waiting-supplier"
  | "on-the-way"
  | "delivered";

const FILTER_OPTIONS: Array<{ id: OrdersFilter; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "drafts", label: "Brouillons" },
  { id: "waiting-supplier", label: "Attente fournisseur" },
  { id: "on-the-way", label: "En route" },
  { id: "delivered", label: "Réceptionnées" },
];

function getDraftIntentFromOrder(order: MerchantOrder): CartDraftIntent {
  if (order.sourceDetail === "low-stock-reorder") {
    return "low-stock-restock";
  }

  if (order.sourceDetail === "inventory-restock") {
    return "inventory-restock";
  }

  if (
    order.sourceDetail === "quick-reorder" ||
    order.sourceDetail === "saved-basket-reload"
  ) {
    return "order-history-restock";
  }

  return "manual-new-order";
}

function getOrderActionHint(order: MerchantOrder): string {
  if (isEditableMerchantOrder(order.status)) {
    return "Brouillon enregistré, encore modifiable";
  }

  if (isWaitingSupplierMerchantOrder(order.status)) {
    return "Commande envoyée, réponse fournisseur en attente";
  }

  if (isDeliveredMerchantOrder(order.status)) {
    return "Commande réceptionnée, panier relançable si besoin";
  }

  return "Commande envoyée, détails disponibles";
}

function getOrdersStatusLabel(order: MerchantOrder): string {
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

function getOrdersSourceLabel(order: MerchantOrder): string {
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

function matchesOrdersFilter(order: MerchantOrder, filter: OrdersFilter): boolean {
  if (filter === "all") return true;
  if (filter === "drafts") return isEditableMerchantOrder(order.status);
  if (filter === "waiting-supplier") {
    return isWaitingSupplierMerchantOrder(order.status);
  }
  if (filter === "on-the-way") return isOnTheWayMerchantOrder(order.status);
  if (filter === "delivered") return isDeliveredMerchantOrder(order.status);
  return true;
}

export default function OrdersPage() {
  const router = useRouter();
  const { setCartItems, startDraft } = useCart();
  const { orders, launchDraftOrder, buildDraftFromOrder } = useMerchantData();
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrdersFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const draftOrders = orders.filter((order) => isEditableMerchantOrder(order.status));
  const waitingSupplierOrders = orders.filter((order) =>
    isWaitingSupplierMerchantOrder(order.status)
  );
  const onTheWayOrders = orders.filter((order) =>
    isOnTheWayMerchantOrder(order.status)
  );
  const deliveredOrders = orders.filter((order) =>
    isDeliveredMerchantOrder(order.status)
  );
  const attentionOrders = orders.filter(
    (order) =>
      isEditableMerchantOrder(order.status) ||
      isWaitingSupplierMerchantOrder(order.status)
  );

  const filteredOrders = orders.filter((order) => {
    if (!matchesOrdersFilter(order, statusFilter)) {
      return false;
    }

    if (deferredSearch.length === 0) return true;

    return [
      order.reference,
      order.supplierName,
      order.status,
      order.deliveryAddress,
      order.items.map((item) => item.name).join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(deferredSearch);
  });

  function handleNewOrder() {
    startDraft("Orders");
    router.push("/orders/new");
  }

  async function handleReorder(orderId: string) {
    try {
      setActionError(null);
      const reorderDraft = buildDraftFromOrder(orderId);
      if (reorderDraft.length === 0) return;

      const draftOrder = await launchDraftOrder({
        items: reorderDraft,
        source: "Orders",
        reason: "orders-reorder",
      });
      if (!draftOrder) return;

      setCartItems(
        reorderDraft,
        "replace",
        "Orders",
        draftOrder.id,
        "order-history-restock"
      );
      router.push("/orders/new");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de relancer ce panier."
      );
    }
  }

  function handleReviewAndConfirm(order: MerchantOrder) {
    const draftItems = buildDraftFromOrder(order.id);
    if (draftItems.length === 0) return;

    setCartItems(
      draftItems,
      "replace",
      order.source,
      order.status === "Draft" ? order.id : null,
      getDraftIntentFromOrder(order)
    );
    setSelectedOrder(null);
    router.push("/order-summary");
  }

  function handleResumeDraft(order: MerchantOrder) {
    const draftItems = buildDraftFromOrder(order.id);
    if (draftItems.length === 0) return;

    setCartItems(
      draftItems,
      "replace",
      order.source,
      order.id,
      getDraftIntentFromOrder(order)
    );
    setSelectedOrder(null);
    router.push("/orders/new");
  }

  return (
    <div className="space-y-8">
      {actionError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {actionError}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Commandes
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Créez et suivez vos commandes fournisseur au même endroit
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            Créez une nouvelle commande ou relancez un panier déjà utilisé en un clic.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewOrder}
          className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background"
        >
          + Nouvelle commande
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Total commandes</p>
          <p className="mt-2 font-heading text-3xl font-bold text-primary">
            {orders.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Tous les paniers fournisseur enregistrés
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Brouillons enregistrés</p>
          <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
            {draftOrders.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Paniers modifiables non envoyés
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Attente fournisseur</p>
          <p className="mt-2 font-heading text-3xl font-bold text-yellow-300">
            {waitingSupplierOrders.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Commandes envoyées en attente de réponse
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">En route</p>
          <p className="mt-2 font-heading text-3xl font-bold text-cyan-300">
            {onTheWayOrders.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Commandes confirmées ou déjà en acheminement
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Réceptionnées</p>
          <p className="mt-2 font-heading text-3xl font-bold text-emerald-300">
            {deliveredOrders.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Commandes fournisseur déjà reçues
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-primary">
                Suivi des commandes
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Les brouillons restent modifiables ici. Les commandes envoyées restent en lecture, avec relance du panier si besoin.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="relative block min-w-[280px]">
                <span className="sr-only">Rechercher une commande</span>
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
                  placeholder="Rechercher une commande..."
                  className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((filterOption) => {
                  const isActive = filterOption.id === statusFilter;
                  return (
                    <button
                      key={filterOption.id}
                      type="button"
                      onClick={() => setStatusFilter(filterOption.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-accent/30 bg-accent/10 text-accent"
                          : "border-border text-secondary hover:border-border-bright hover:text-primary"
                      }`}
                    >
                      {filterOption.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-border bg-surface/50 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-primary">
                        {order.reference}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          ORDER_STATUS_COLORS[order.status]
                        }`}
                      >
                        {getOrdersStatusLabel(order)}
                      </span>
                    </div>

                    <p className="mt-3 text-base font-medium text-primary">
                      {order.supplierName}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {getOrdersSourceLabel(order)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {order.items.length} ligne
                      {order.items.length === 1 ? "" : "s"} |{" "}
                      {getMerchantOrderTotalUnits(order)} unités
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getMerchantOrderItemPreview(order).map((itemPreview) => (
                        <span
                          key={`${order.id}-${itemPreview}`}
                          className="rounded-full border border-border bg-surface-bright/60 px-2.5 py-1 text-xs text-secondary"
                        >
                          {itemPreview}
                        </span>
                      ))}
                      {order.items.length > 3 ? (
                        <span className="rounded-full border border-border bg-surface-bright/60 px-2.5 py-1 text-xs text-muted">
                          +{order.items.length - 3} autre
                          {order.items.length - 3 === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      Livraison: {formatMerchantAddress(order.deliveryAddress)}
                    </p>
                  </div>

                  <div className="flex min-w-[220px] flex-col items-start gap-3 lg:items-end">
                    <div className="text-left lg:text-right">
                      <p className="text-lg font-semibold text-accent">
                        {formatCdf(order.totalAmount)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Créée le {formatDateTime(order.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Arrivée prévue {order.deliveryDate}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {getOrderActionHint(order)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {isEditableMerchantOrder(order.status) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                          >
                            Voir le panier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResumeDraft(order)}
                            className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                          >
                            Continuer la modification
                          </button>
                        </>
                      ) : isDeliveredMerchantOrder(order.status) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                          >
                            Voir le panier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(order.id)}
                            className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                          >
                            Relancer le panier
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReorder(order.id)}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                          >
                            Relancer le panier
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                          >
                            Voir le panier
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm text-primary">
                  Aucune commande ne correspond à cette recherche.
                </p>
                <p className="mt-1 text-xs text-muted">
                  Effacez la recherche ou créez une nouvelle commande fournisseur.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-heading text-lg font-semibold text-primary">
              À suivre
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Brouillons à terminer et commandes envoyées encore sans réponse fournisseur.
            </p>
            <div className="mt-4 space-y-3">
              {attentionOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-border bg-surface/50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">
                        {order.supplierName}
                      </p>
                      <p className="mt-1 text-xs text-muted">{order.reference}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {getOrdersSourceLabel(order)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        ORDER_STATUS_COLORS[order.status]
                      }`}
                    >
                      {getOrdersStatusLabel(order)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-secondary">
                    {order.items.length} ligne
                    {order.items.length === 1 ? "" : "s"} | {formatCdf(order.totalAmount)}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {isEditableMerchantOrder(order.status)
                      ? "Encore modifiable, pas encore envoyée"
                      : "Envoyée, en attente du retour fournisseur"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isEditableMerchantOrder(order.status) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleResumeDraft(order)}
                          className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                        >
                          Continuer la modification
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                        >
                          Voir le panier
                        </button>
                      </>
                    ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                        >
                        Voir le panier
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {attentionOrders.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  Aucun brouillon ni retour fournisseur à suivre pour le moment.
                </p>
              )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-heading text-lg font-semibold text-primary">
              Réceptionnées récemment
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Paniers déjà reçus que vous pouvez relancer vite si besoin.
            </p>
            <div className="mt-4 space-y-3">
              {deliveredOrders.slice(0, 4).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleReorder(order.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-surface/50 px-3 py-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-bright"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">
                      {order.reference}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {order.items.map((item) => item.name).join(" | ")}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-accent">
                    Relancer le panier
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OrderDetailsDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onResumeDraft={(orderId) => {
          const order = orders.find((entry) => entry.id === orderId);
          if (!order) return;
          handleResumeDraft(order);
        }}
        onReviewAndConfirm={(orderId) => {
          const order = orders.find((entry) => entry.id === orderId);
          if (!order) return;
          handleReviewAndConfirm(order);
        }}
        onReloadBasket={(orderId) => handleReorder(orderId)}
      />
    </div>
  );
}
