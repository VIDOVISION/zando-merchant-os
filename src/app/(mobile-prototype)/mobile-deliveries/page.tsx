"use client";

import { useMemo, useRef, useState } from "react";

import {
  DeliveryCard,
  LiveMapCta,
  MobilePageShell,
  SearchFilterBar,
  SectionCard,
  StatCard,
  StatusTabs,
  TopHeader,
} from "@/components/mobile-prototype/components";
import type {
  DeliveryItem,
  MobileStat,
} from "@/components/mobile-prototype/mock-data";
import {
  type Order,
  type OrderStatus,
  useMobileOrders,
} from "../_store/mobile-orders-store";

type DeliveryFilter = "All" | "Pending" | "In Transit" | "Completed" | "Failed";

interface DeliveryOrder {
  order: Order;
  delivery: DeliveryItem;
}

const DELIVERY_FILTERS: DeliveryFilter[] = [
  "All",
  "Pending",
  "In Transit",
  "Completed",
  "Failed",
];

function formatCDF(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-CD").format(
    Number.isFinite(amount) ? amount : 0
  )} CDF`;
}

function getDisplayOrderNumber(index: number): string {
  return `#${3291 + Math.max(index, 0)}`;
}

function getItemsLabel(itemsCount: number): string {
  if (itemsCount === 0) return "No items linked";
  return `${itemsCount} ${itemsCount === 1 ? "item" : "items"}`;
}

function getDeliveryStatus(status: OrderStatus): DeliveryItem["status"] | null {
  if (status === "Ready for Pickup") return "Pending";
  if (status === "In Transit") return "In Transit";
  if (status === "Delivered") return "Completed";
  return null;
}

function getDeliveryStatusText(status: OrderStatus): string {
  if (status === "Ready for Pickup") return "Pending pickup";
  if (status === "In Transit") return "In Transit";
  if (status === "Delivered") return "Completed";
  return status;
}

function getDriverPlaceholder(status: OrderStatus): string {
  if (status === "Ready for Pickup") return "Not assigned";
  if (status === "In Transit") return "Zando Driver";
  if (status === "Delivered") return "Completed";
  return "Not assigned";
}

function getDeliveryAction(status: OrderStatus): string {
  if (status === "Ready for Pickup") return "Start Delivery";
  if (status === "In Transit") return "Mark Delivered";
  return "View Receipt";
}

function getActionSuccessMessage(status: OrderStatus): string {
  if (status === "Ready for Pickup") return "Delivery started";
  if (status === "In Transit") return "Order marked delivered";
  return "Delivery updated";
}

function getOrderDetailsHref(orderId: string): string {
  return `/mobile-orders/${encodeURIComponent(orderId.replace(/^#/, ""))}`;
}

function mapOrderToDeliveryOrder(order: Order, index: number): DeliveryOrder | null {
  const deliveryStatus = getDeliveryStatus(order.status);
  if (!deliveryStatus) return null;

  return {
    order,
    delivery: {
      id: getDisplayOrderNumber(index),
      store: order.store,
      items: getItemsLabel(order.itemsCount),
      amount: formatCDF(order.amount),
      status: deliveryStatus,
      statusText: getDeliveryStatusText(order.status),
      time: order.time,
      driver: getDriverPlaceholder(order.status),
      rating: "N/A",
      eta: order.status === "In Transit" ? "Today" : undefined,
    },
  };
}

function buildDeliveryStats(deliveries: DeliveryOrder[]): MobileStat[] {
  const pending = deliveries.filter(
    (deliveryOrder) => deliveryOrder.order.status === "Ready for Pickup"
  ).length;
  const inTransit = deliveries.filter(
    (deliveryOrder) => deliveryOrder.order.status === "In Transit"
  ).length;
  const completed = deliveries.filter(
    (deliveryOrder) => deliveryOrder.order.status === "Delivered"
  ).length;

  return [
    {
      label: "Pending",
      value: String(pending),
      helper: "Awaiting pickup",
      tone: "orange",
      iconName: "box",
    },
    {
      label: "In Transit",
      value: String(inTransit),
      helper: "On the way",
      tone: "blue",
      iconName: "truck",
    },
    {
      label: "Completed",
      value: String(completed),
      helper: "Delivered",
      tone: "green",
      iconName: "badge-check",
    },
    {
      label: "Failed",
      value: "0",
      helper: "For now",
      tone: "pink",
      iconName: "x-circle",
    },
  ];
}

function filterDeliveryOrders(
  deliveries: DeliveryOrder[],
  activeFilter: DeliveryFilter
): DeliveryOrder[] {
  if (activeFilter === "All") return deliveries;
  if (activeFilter === "Pending") {
    return deliveries.filter((deliveryOrder) => deliveryOrder.order.status === "Ready for Pickup");
  }
  if (activeFilter === "In Transit") {
    return deliveries.filter((deliveryOrder) => deliveryOrder.order.status === "In Transit");
  }
  if (activeFilter === "Completed") {
    return deliveries.filter((deliveryOrder) => deliveryOrder.order.status === "Delivered");
  }
  return [];
}

export default function MobileDeliveriesPage() {
  const { advanceOrderStatus, error, loading, orders } = useMobileOrders();
  const [activeFilter, setActiveFilter] = useState<DeliveryFilter>("All");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleError = actionError ?? (error ? "Could not load deliveries." : null);

  const deliveryOrders = useMemo(
    () =>
      orders
        .map((order, index) => mapOrderToDeliveryOrder(order, index))
        .filter((deliveryOrder): deliveryOrder is DeliveryOrder => Boolean(deliveryOrder)),
    [orders]
  );

  const deliveryStats = useMemo(() => buildDeliveryStats(deliveryOrders), [deliveryOrders]);
  const deliveryTabs = useMemo(
    () =>
      DELIVERY_FILTERS.map((filter) => {
        const count =
          filter === "All"
            ? deliveryOrders.length
            : filterDeliveryOrders(deliveryOrders, filter).length;

        return { label: filter, count: String(count) };
      }),
    [deliveryOrders]
  );
  const visibleDeliveries = useMemo(
    () => filterDeliveryOrders(deliveryOrders, activeFilter),
    [activeFilter, deliveryOrders]
  );
  const activeTabIndex = DELIVERY_FILTERS.indexOf(activeFilter);

  function showSuccessMessage(message: string) {
    setActionError(null);
    setSuccessMessage(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }

  async function handleDeliveryAction(order: Order) {
    setActionError(null);
    setSuccessMessage(null);
    setActiveActionId(order.id);

    const result = await advanceOrderStatus(order.id, order);

    setActiveActionId(null);

    if (result.success) {
      showSuccessMessage(getActionSuccessMessage(order.status));
      return;
    }

    if (result.error) {
      setActionError(result.error);
    }
  }

  return (
    <MobilePageShell active="deliveries" navVariant="deliveries">
      <TopHeader showSearch />

      <main className="mt-10 space-y-4 pb-28">
        <section>
          <h1 className="text-3xl font-bold text-white">Deliveries</h1>
          <p className="mt-2 text-base text-slate-300">
            Track all deliveries in real time.
          </p>
        </section>

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 shadow-lg shadow-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-100">{successMessage}</p>
          </div>
        ) : null}

        {visibleError ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            {visibleError}
          </SectionCard>
        ) : null}

        <section className="grid grid-cols-2 gap-3">
          {deliveryStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <SearchFilterBar placeholder="Search delivery or order ID..." />
        <StatusTabs
          tabs={deliveryTabs}
          activeIndex={activeTabIndex >= 0 ? activeTabIndex : 0}
          onChange={(index) => setActiveFilter(DELIVERY_FILTERS[index] ?? "All")}
        />

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-white">Deliveries List</h2>

          {loading ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              Loading deliveries...
            </SectionCard>
          ) : null}

          {!loading && visibleDeliveries.length === 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              No deliveries found.
            </SectionCard>
          ) : null}

          {!loading
            ? visibleDeliveries.map(({ delivery, order }) => {
                const actionLabel = getDeliveryAction(order.status);
                const isDelivered = order.status === "Delivered";

                return (
                  <DeliveryCard
                    key={order.id}
                    delivery={delivery}
                    primaryAction={actionLabel}
                    primaryHref={isDelivered ? getOrderDetailsHref(order.id) : undefined}
                    onPrimaryAction={
                      isDelivered ? undefined : () => void handleDeliveryAction(order)
                    }
                    actionDisabled={activeActionId === order.id}
                  />
                );
              })
            : null}
        </section>

        <LiveMapCta />
      </main>
    </MobilePageShell>
  );
}
