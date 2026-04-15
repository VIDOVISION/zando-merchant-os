"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import OrderDetailsDrawer from "@/components/orders/OrderDetailsDrawer";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import {
  DELIVERY_TRACKING_STATUSES,
  ORDER_STATUS_COLORS,
  formatCdf,
  getDeliveryTrackingStatus,
  getMerchantOrderItemPreview,
  getMerchantOrderTotalUnits,
  getNextDeliveryTrackingStatus,
  isTrackedDeliveryOrder,
  type DeliveryTrackingStatus,
  type MerchantOrder,
} from "@/lib/merchant-data";

const FILTER_OPTIONS = ["All", ...DELIVERY_TRACKING_STATUSES] as const;

type DeliveryFilter = (typeof FILTER_OPTIONS)[number];
type DeliveryOrder = MerchantOrder & { deliveryStatus: DeliveryTrackingStatus };

function getFilterLabel(filter: DeliveryFilter): string {
  if (filter === "All") return "Toutes";
  return getDeliveryStageLabel(filter);
}

function getDeliveryStageLabel(status: DeliveryTrackingStatus): string {
  if (status === "Pending") return "En attente de confirmation fournisseur";
  if (status === "In Transit") return "En route";
  return "Réceptionné";
}

function getDeliverySortScore(status: DeliveryTrackingStatus): number {
  if (status === "Pending") return 0;
  if (status === "In Transit") return 1;
  return 2;
}

function getDeliveryEtaDate(order: DeliveryOrder): Date | null {
  const deliveryYear = new Date(order.createdAt).getFullYear();
  const parsedDate = new Date(`${order.deliveryDate} ${deliveryYear}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function isDelayedDelivery(order: DeliveryOrder): boolean {
  if (order.deliveryStatus === "Delivered") {
    return false;
  }

  const etaDate = getDeliveryEtaDate(order);
  if (!etaDate) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return etaDate < todayStart;
}

function getDeliveryActionLabel(status: DeliveryTrackingStatus): string | null {
  if (status === "Pending") return "Marquer en route";
  if (status === "In Transit") return "Marquer réceptionné";
  return null;
}

function getDeliveryStatusSummary(order: DeliveryOrder): string {
  if (order.deliveryStatus === "Pending") {
    return "Commande envoyée au fournisseur, en attente de retour avant l’arrivée du stock.";
  }

  if (order.deliveryStatus === "In Transit") {
    return "Le stock est déjà en route vers la boutique.";
  }

  return "Le stock a été réceptionné et doit déjà apparaître dans le stock.";
}

export default function DeliveriesPage() {
  const { orders, updateDeliveryStatus } = useMerchantData();
  const [statusFilter, setStatusFilter] = useState<DeliveryFilter>("All");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const deliveryOrders = useMemo<DeliveryOrder[]>(
    () =>
      orders
        .flatMap((order) => {
          const deliveryStatus = getDeliveryTrackingStatus(order.status);
          if (!isTrackedDeliveryOrder(order.status) || !deliveryStatus) {
            return [];
          }

          return [{ ...order, deliveryStatus }];
        })
        .sort((left, right) => {
          const statusScoreDiff =
            getDeliverySortScore(left.deliveryStatus) -
            getDeliverySortScore(right.deliveryStatus);

          if (statusScoreDiff !== 0) {
            return statusScoreDiff;
          }

          return (
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          );
        }),
    [orders]
  );

  const filteredOrders = deliveryOrders.filter((order) =>
    statusFilter === "All" ? true : order.deliveryStatus === statusFilter
  );
  const selectedOrder =
    deliveryOrders.find((order) => order.id === selectedOrderId) ?? null;

  const awaitingCount = deliveryOrders.filter(
    (order) => order.deliveryStatus === "Pending"
  ).length;
  const movingCount = deliveryOrders.filter(
    (order) => order.deliveryStatus === "In Transit"
  ).length;
  const deliveredCount = deliveryOrders.filter(
    (order) => order.deliveryStatus === "Delivered"
  ).length;
  const delayedCount = deliveryOrders.filter((order) => isDelayedDelivery(order)).length;

  async function handleAdvanceStatus(order: DeliveryOrder) {
    try {
      setActionError(null);
      const nextStatus = getNextDeliveryTrackingStatus(order.status);
      if (!nextStatus) return;

      await updateDeliveryStatus(order.id, nextStatus);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour cette livraison pour le moment."
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

      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Livraisons
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Suivez les arrivages après l’envoi de la commande
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            Les livraisons commencent seulement après l’envoi au fournisseur.
            Les brouillons restent dans Commandes jusqu’à confirmation. Cette page
            sert à suivre ce qui attend une réponse, ce qui est en route, et ce qui
            est déjà réceptionné à la boutique.
          </p>
        </div>

        <Link
          href="/orders"
          className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background"
        >
          Ouvrir les commandes
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">En attente fournisseur</p>
          <p className="mt-2 font-heading text-3xl font-bold text-yellow-300">
            {awaitingCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Commandes envoyées encore sans confirmation fournisseur
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">En route</p>
          <p className="mt-2 font-heading text-3xl font-bold text-sky-300">
            {movingCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Stock confirmé et déjà en route vers la boutique
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Réceptionné</p>
          <p className="mt-2 font-heading text-3xl font-bold text-emerald-300">
            {deliveredCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Commandes déjà reçues dans le stock boutique
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">À suivre</p>
          <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
            {delayedCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Livraisons dont la date prévue est dépassée
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Étape de livraison
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Filtrez les arrivages selon les quelques étapes qu’un commerçant suit vraiment.
            </p>
          </div>
          <p className="text-xs text-muted">
            {filteredOrders.length} livraison
            {filteredOrders.length === 1 ? "" : "s"} affichée
            {filteredOrders.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((filter) => {
            const isActive = statusFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-accent/30 bg-accent/15 text-accent"
                    : "border-border bg-surface/50 text-secondary hover:border-accent/20 hover:text-primary"
                }`}
              >
                {getFilterLabel(filter)}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold text-primary">
            Suivi des arrivages
          </h2>
          <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {filteredOrders.length}
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-sm text-secondary">
              Aucune livraison ne correspond à cette étape pour le moment.
            </p>
            <p className="mt-2 text-xs text-muted">
              Les brouillons restent dans Commandes jusqu’à confirmation et envoi.
            </p>
            <Link href="/orders" className="mt-3 inline-block text-sm text-accent hover:underline">
              Ouvrir les commandes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const totalUnits = getMerchantOrderTotalUnits(order);
              const itemPreview = getMerchantOrderItemPreview(order);
              const delayed = isDelayedDelivery(order);
              const actionLabel = getDeliveryActionLabel(order.deliveryStatus);
              const statusBadgeColor =
                order.deliveryStatus === "Delivered"
                  ? ORDER_STATUS_COLORS.Delivered
                  : order.deliveryStatus === "In Transit"
                    ? ORDER_STATUS_COLORS["In Transit"]
                    : ORDER_STATUS_COLORS.Pending;

              return (
                <div key={order.id} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-primary">
                          {order.reference}
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            statusBadgeColor
                          }`}
                        >
                          {getDeliveryStageLabel(order.deliveryStatus)}
                        </span>
                        {delayed ? (
                          <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                            En retard
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-medium text-primary">
                        {order.supplierName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Prévu {order.deliveryDate} | {order.items.length} ligne
                        {order.items.length === 1 ? "" : "s"} | {totalUnits} unité
                        {totalUnits === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-lg font-semibold text-accent">
                        {formatCdf(order.totalAmount)}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        {getDeliveryStatusSummary(order)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-surface/40 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                      Résumé du panier
                    </p>
                    <p className="mt-3 text-sm text-primary">
                      {itemPreview.join(" | ")}
                    </p>
                    {order.items.length > itemPreview.length ? (
                      <p className="mt-2 text-xs text-muted">
                        +{order.items.length - itemPreview.length} autre
                        {order.items.length - itemPreview.length === 1 ? "" : "s"} ligne
                        {order.items.length - itemPreview.length === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                    >
                      Voir la commande
                    </button>
                    {actionLabel ? (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus(order)}
                        className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background"
                      >
                        {actionLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <OrderDetailsDrawer
        order={
          selectedOrder
            ? {
                ...selectedOrder,
                status: selectedOrder.deliveryStatus,
              }
            : null
        }
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
