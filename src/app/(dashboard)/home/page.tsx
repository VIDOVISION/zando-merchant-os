"use client";

import Link from "next/link";
import { useState } from "react";
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
  getMerchantOrderItemPreview,
  getMerchantOrderTotalUnits,
  isEditableMerchantOrder,
  type MerchantOrder,
} from "@/lib/merchant-data";

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

function getActiveOrderCardHint(order: MerchantOrder): string {
  if (isEditableMerchantOrder(order.status)) {
    return "Brouillon enregistre, encore modifiable";
  }

  if (order.status === "Pending") {
    return "Commande envoyee, en attente du fournisseur";
  }

  return "Commande deja lancee, vous pouvez relancer le meme panier";
}

function getHomeOrderStatusLabel(order: MerchantOrder): string {
  if (order.status === "Draft") return "Brouillon";
  if (order.status === "Pending") return "Attente fournisseur";
  if (order.status === "Confirmed") return "Confirmee";
  if (order.status === "Packed") return "Preparee";
  if (order.status === "In Transit") return "En route";
  if (order.status === "Delivered") return "Recue";
  return "Annulee";
}

function getHomeOrderSourceLabel(order: MerchantOrder): string {
  if (order.sourceDetail === "saved-basket-reload") return "Ancien panier";
  if (order.sourceDetail === "inventory-restock") return "Reappro stock";
  if (order.sourceDetail === "low-stock-reorder") return "Stock bas";
  if (order.sourceDetail === "quick-reorder") return "Relance rapide";
  return "Nouvelle commande";
}

function getHomeStockStatusLabel(stockStatus: string): string {
  if (stockStatus === "Out of Stock") return "Rupture";
  if (stockStatus === "Low Stock") return "Stock bas";
  return "Bon stock";
}

function getHomeActivityLabel(
  activity: Pick<MerchantOrder, never> & {
    type: "alert" | "order" | "delivery" | "sale";
    tone: "accent" | "warning" | "success";
  }
): string {
  if (activity.type === "delivery" && activity.tone === "success") {
    return "Livre";
  }

  if (activity.type === "order" && activity.tone === "success") {
    return "Envoyee";
  }

  if (activity.type === "order" && activity.tone === "warning") {
    return "A revoir";
  }

  if (activity.type === "alert") {
    return "A traiter";
  }

  if (activity.type === "sale") {
    return "Vente";
  }

  return "Info";
}

function formatHomeRelativeActivity(dateString: string): string {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) {
    return "A l'instant";
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Il y a ${diffDays} j`;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(target);
}

export default function HomePage() {
  const router = useRouter();
  const { setCartItems, startDraft } = useCart();
  const {
    state,
    lowStockProducts,
    activeOrders,
    todaySales,
    topSellingProducts,
    salesLowStockInsights,
    recentActivity,
    lastSuccessfulOrder,
    launchDraftOrder,
    buildDraftFromProduct,
    buildDraftFromOrder,
    findProduct,
  } = useMerchantData();
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const salesTodayValue = todaySales.reduce(
    (runningTotal, sale) => runningTotal + sale.totalAmount,
    0
  );
  const latestSavedBasketDraft =
    activeOrders.find(
      (order) =>
        order.status === "Draft" && order.sourceDetail === "saved-basket-reload"
    ) ?? null;
  const repeatBasketOrder = latestSavedBasketDraft ?? lastSuccessfulOrder;
  const salesRiskByProductId = new Map(
    salesLowStockInsights.map((insight) => [insight.productId, insight])
  );

  async function handleQuickReorderFromProduct(productId: string) {
    try {
      setActionError(null);
      const reorderDraft = buildDraftFromProduct(productId);
      const product = findProduct(productId);
      if (reorderDraft.length === 0) return;

      const draftOrder = await launchDraftOrder({
        items: reorderDraft,
        source: "Home",
        reason: "home-low-stock",
        productName: product?.name,
      });
      if (!draftOrder) return;

      setCartItems(
        reorderDraft,
        "replace",
        "Home",
        draftOrder.id,
        "low-stock-restock"
      );
      router.push("/orders/new");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir ce brouillon de reappro."
      );
    }
  }

  async function handleQuickReorderLastOrder() {
    try {
      setActionError(null);
      if (!lastSuccessfulOrder) return;
      const reorderDraft = buildDraftFromOrder(lastSuccessfulOrder.id);
      const draftOrder = await launchDraftOrder({
        items: reorderDraft,
        source: "Home",
        reason: "home-basket",
      });
      if (!draftOrder) return;

      setCartItems(
        reorderDraft,
        "replace",
        "Home",
        draftOrder.id,
        "repeat-saved-basket"
      );
      router.push("/orders/new");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de recharger ce panier."
      );
    }
  }

  function handleStartNewOrder() {
    startDraft("Home");
    router.push("/orders/new");
  }

  function handleContinueSavedDraft(order: MerchantOrder) {
    const draftItems = buildDraftFromOrder(order.id);
    if (draftItems.length === 0) return;

    setCartItems(
      draftItems,
      "replace",
      order.source,
      order.id,
      getDraftIntentFromOrder(order)
    );
    router.push("/orders/new");
  }

  async function handleReloadOrderBasket(order: MerchantOrder) {
    try {
      setActionError(null);
      const reorderDraft = buildDraftFromOrder(order.id);
      const draftOrder = await launchDraftOrder({
        items: reorderDraft,
        source: "Home",
        reason: "home-basket",
      });
      if (!draftOrder) return;

      setCartItems(
        reorderDraft,
        "replace",
        "Home",
        draftOrder.id,
        "order-history-restock"
      );
      setSelectedOrder(null);
      router.push("/orders/new");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de relancer ce panier."
      );
    }
  }

  function handleReviewAndConfirmOrder(order: MerchantOrder) {
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

  return (
    <div className="space-y-8">
      {actionError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {actionError}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Accueil
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            {state.profile.storeName} aujourd'hui
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Tout ce qui compte pour la boutique a {state.profile.neighborhood},{" "}
            {state.profile.city} : stock a surveiller, commandes fournisseur,
            ventes du jour et activite recente.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartNewOrder}
          className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background"
        >
          Nouvelle commande
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Alertes stock</p>
          <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
            {lowStockProducts.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Rayons a reapprovisionner
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Commandes en cours</p>
          <p className="mt-2 font-heading text-3xl font-bold text-accent">
            {activeOrders.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Brouillons et commandes fournisseur en suivi
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Ventes du jour</p>
          <p className="mt-2 font-heading text-3xl font-bold text-primary">
            {formatCdf(salesTodayValue)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {todaySales.length} vente{todaySales.length === 1 ? "" : "s"} enregistree{todaySales.length === 1 ? "" : "s"} aujourd'hui
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Dernier panier</p>
          <p className="mt-2 font-heading text-3xl font-bold text-primary">
            {repeatBasketOrder
              ? formatCdf(repeatBasketOrder.totalAmount)
              : "--"}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {latestSavedBasketDraft
              ? "Montant du brouillon en cours"
              : "Relancer vite le dernier panier confirme"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-primary">
                  Alertes stock
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Commencez par les rayons qui peuvent bloquer les ventes.
                </p>
              </div>
              <Link href="/inventory" className="text-sm text-accent hover:underline">
                Ouvrir le stock
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {lowStockProducts.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-border bg-surface/50 p-4"
                >
                  {salesRiskByProductId.get(product.id) ? (
                    <div className="mb-3 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                      Les ventes recentes ont fait baisser ce stock
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-primary">
                          {product.name}
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            product.stockStatus === "Out of Stock"
                              ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {getHomeStockStatusLabel(product.stockStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {product.stockOnHand} en stock | reappro {product.reorderQuantity} |{" "}
                        {product.supplier}
                      </p>
                      {salesRiskByProductId.get(product.id) ? (
                        <p className="mt-2 text-xs text-secondary">
                          {salesRiskByProductId.get(product.id)?.quantitySold} vendu{salesRiskByProductId.get(product.id)?.quantitySold === 1 ? "" : "s"} recemment, il ne reste que{" "}
                          {salesRiskByProductId.get(product.id)?.stockAfterSale}.
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickReorderFromProduct(product.id)}
                      className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                    >
                      Preparer reappro
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-primary">
                  Commandes en cours
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Paniers fournisseur encore en attente, en route ou a finir.
                </p>
              </div>
              <Link href="/orders" className="text-sm text-accent hover:underline">
                Voir les commandes
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {activeOrders.map((order) => (
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
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            ORDER_STATUS_COLORS[order.status]
                          }`}
                        >
                          {getHomeOrderStatusLabel(order)}
                        </span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted">
                          {getHomeOrderSourceLabel(order)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-medium text-primary">
                        {order.supplierName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Arrivee prevue {order.deliveryDate} | {order.items.length} ligne
                        {order.items.length === 1 ? "" : "s"} |{" "}
                        {getMerchantOrderTotalUnits(order)} unite
                        {getMerchantOrderTotalUnits(order) === 1 ? "" : "s"}
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
                    </div>

                    <div className="flex min-w-[220px] flex-col items-start gap-3 lg:items-end">
                      <div className="text-left lg:text-right">
                        <p className="text-lg font-semibold text-accent">
                          {formatCdf(order.totalAmount)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {getActiveOrderCardHint(order)}
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
                              Voir panier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleContinueSavedDraft(order)}
                              className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                            >
                              Continuer
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReloadOrderBasket(order)}
                              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                            >
                              Relancer panier
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                            >
                              Voir panier
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {activeOrders.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-primary">Aucune commande en cours aujourd'hui.</p>
                  <p className="mt-1 text-xs text-muted">
                    Lancez un nouveau panier fournisseur pour reapprovisionner la boutique.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-primary">
                  Relancer le dernier panier
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  {latestSavedBasketDraft
                    ? "Votre brouillon garde deja les dernieres quantites et le dernier total."
                    : "Rechargez le dernier panier confirme sans tout refaire."}
                </p>
              </div>
            </div>

            {repeatBasketOrder ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface/50 p-4">
                {latestSavedBasketDraft ? (
                  <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    Brouillon en cours
                  </span>
                ) : null}
                <p className="mt-2 font-mono text-sm font-semibold text-primary">
                  {repeatBasketOrder.reference}
                </p>
                <p className="mt-2 text-sm text-primary">
                  {repeatBasketOrder.supplierName}
                </p>
                <p className="mt-2 text-xs text-secondary">
                  {repeatBasketOrder.items
                    .map((item) => `${item.name} x${item.quantity}`)
                    .join(" | ")}
                </p>
                <p className="mt-3 text-lg font-semibold text-accent">
                  {formatCdf(repeatBasketOrder.totalAmount)}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    latestSavedBasketDraft
                      ? handleContinueSavedDraft(latestSavedBasketDraft)
                      : handleQuickReorderLastOrder()
                  }
                  className="mt-4 w-full rounded-xl border border-accent/20 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  {latestSavedBasketDraft
                    ? "Continuer brouillon"
                    : "Relancer panier"}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-primary">
                  Aucun panier confirme a relancer pour le moment.
                </p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-border bg-surface/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Produits qui sortent vite
              </p>
              <div className="mt-3 space-y-2">
                {topSellingProducts.slice(0, 3).map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-secondary">
                      {product.productName} x{product.unitsSold}
                    </span>
                    <span className="font-medium text-primary">
                      {formatCdf(product.revenue)}
                    </span>
                  </div>
                ))}

                {topSellingProducts.length === 0 && (
                  <p className="text-xs text-muted">
                    Enregistrez des ventes pour voir ce qui part le plus aujourd'hui.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-primary">
                  Activite recente
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Les dernieres nouvelles sur les ventes, les paniers fournisseur et ce qui demande encore une action.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-3 rounded-2xl border border-border bg-surface/50 p-4"
                >
                  <div
                    className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                      activity.tone === "warning"
                        ? "bg-amber-300"
                        : activity.tone === "success"
                          ? "bg-emerald-300"
                          : "bg-accent"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                        <span
                          className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            activity.tone === "warning"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                              : activity.tone === "success"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : "border-accent/20 bg-accent/10 text-accent"
                          }`}
                        >
                          {getHomeActivityLabel(activity)}
                        </span>
                        <p className="text-sm font-medium text-primary">
                          {activity.title}
                        </p>
                      </div>
                      <span className="text-xs text-muted">
                        {formatHomeRelativeActivity(activity.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-secondary">
                      {activity.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OrderDetailsDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onResumeDraft={(orderId) => {
          const order = activeOrders.find((entry) => entry.id === orderId);
          if (!order) return;
          handleContinueSavedDraft(order);
        }}
        onReviewAndConfirm={(orderId) => {
          const order = activeOrders.find((entry) => entry.id === orderId);
          if (!order) return;
          handleReviewAndConfirmOrder(order);
        }}
        onReloadBasket={(orderId) => {
          const order = activeOrders.find((entry) => entry.id === orderId);
          if (!order) return;
          handleReloadOrderBasket(order);
        }}
      />
    </div>
  );
}
