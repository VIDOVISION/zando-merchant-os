"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  CreditCard,
  Download,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from "lucide-react";
import { useRef, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
  StatusBadge,
} from "@/components/mobile-prototype/components";
import {
  type Order,
  type OrderStatus,
  useMobileOrders,
} from "../../_store/mobile-orders-store";

type TimelineState = "completed" | "current" | "pending";
type PrimaryActionTone = "blue" | "orange";

interface OrderedProduct {
  name: string;
  quantity: string;
  unitPrice: string;
  total: string;
  image: string;
}

function formatCDF(value: number | string | null | undefined) {
  const amount = parseCurrencyAmount(value);
  return `${new Intl.NumberFormat("fr-CD").format(amount)} CDF`;
}

function buildOrderDetailsFromStore(order: Order): OrderDetails {
  return {
    id: `#${order.id}`,
    status: order.status,
    store: order.store,
    location: "Delivery details pending",
    time: order.time,
    paymentMethod: order.paymentMethod,
    total: formatCDF(order.amount),
    phone: "+243 990 000 001",
    address: "Delivery details pending",
    products: order.products.length
      ? order.products.map((product) => {
          const quantity = product.quantity || 1;
          const lineTotal = parseCurrencyAmount(product.amount);
          const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;

          return {
            name: product.name,
            quantity: String(quantity),
            unitPrice: formatCDF(unitPrice),
            total: formatCDF(lineTotal),
            image: product.image ?? "",
          };
        })
      : [
          {
            name: "No items linked",
            quantity: "0",
            unitPrice: formatCDF(0),
            total: formatCDF(order.amount),
            image: "",
          },
        ],
    subtotal: formatCDF(order.amount),
    deliveryFee: formatCDF(0),
    discount: formatCDF(0),
    paymentStatus: order.status === "Delivered" ? "Paid" : "Pending collection",
  };
}

interface TimelineItem {
  label: string;
  state: TimelineState;
}

interface OrderDetails {
  id: string;
  status: OrderStatus;
  store: string;
  location: string;
  time: string;
  paymentMethod: string;
  total: string;
  phone: string;
  address: string;
  products: OrderedProduct[];
  subtotal: string;
  deliveryFee: string;
  discount: string;
  paymentStatus: string;
}

const orders: OrderDetails[] = [
  {
    id: "#3291",
    status: "Pending",
    store: "Mama Kada Store",
    location: "Gombe, Kinshasa",
    time: "Today, 09:42",
    paymentMethod: "Cash on Delivery",
    total: "86.50 CDF",
    phone: "+243 990 000 001",
    address: "Avenue Commerce, Gombe",
    products: [
      {
        name: "Coca-Cola Case",
        quantity: "2",
        unitPrice: "18.00 CDF",
        total: "36.00 CDF",
        image: "/products/coca-cola-case.png",
      },
      {
        name: "Rice 5kg",
        quantity: "5",
        unitPrice: "10.10 CDF",
        total: "50.50 CDF",
        image: "/products/rice-5kg.png",
      },
    ],
    subtotal: "86.50 CDF",
    deliveryFee: "0 CDF",
    discount: "0 CDF",
    paymentStatus: "Pending collection",
  },
  {
    id: "#3287",
    status: "Confirmed",
    store: "Kwetu Butik",
    location: "Kinshasa, Bandalungwa",
    time: "Today, 08:10",
    paymentMethod: "Paid Online",
    total: "124.00 CDF",
    phone: "+243 990 000 002",
    address: "Avenue Kasa-Vubu, Bandalungwa",
    products: [
      {
        name: "Sardines Cans",
        quantity: "3",
        unitPrice: "24.00 CDF",
        total: "72.00 CDF",
        image: "/products/sardines-cans.png",
      },
      {
        name: "Cooking Oil",
        quantity: "2",
        unitPrice: "26.00 CDF",
        total: "52.00 CDF",
        image: "/products/cooking-oil.png",
      },
    ],
    subtotal: "124.00 CDF",
    deliveryFee: "0 CDF",
    discount: "0 CDF",
    paymentStatus: "Paid",
  },
  {
    id: "#3279",
    status: "In Transit",
    store: "Kimia Mart",
    location: "Kinshasa, Limete",
    time: "Yesterday, 18:25",
    paymentMethod: "Paid Online",
    total: "65.50 CDF",
    phone: "+243 990 000 003",
    address: "Boulevard Lumumba, Limete",
    products: [
      {
        name: "Washing Powder",
        quantity: "1",
        unitPrice: "39.50 CDF",
        total: "39.50 CDF",
        image: "/products/washing-powder.png",
      },
      {
        name: "Sugar 2kg",
        quantity: "2",
        unitPrice: "13.00 CDF",
        total: "26.00 CDF",
        image: "/products/sugar-2kg.png",
      },
    ],
    subtotal: "65.50 CDF",
    deliveryFee: "0 CDF",
    discount: "0 CDF",
    paymentStatus: "Paid",
  },
  {
    id: "#3272",
    status: "Delivered",
    store: "Patrice Mini Market",
    location: "Kinshasa, Ngaba",
    time: "Yesterday, 14:03",
    paymentMethod: "Cash on Delivery",
    total: "42.75 CDF",
    phone: "+243 990 000 004",
    address: "Avenue Universite, Ngaba",
    products: [
      {
        name: "Soft Drinks",
        quantity: "2",
        unitPrice: "17.00 CDF",
        total: "34.00 CDF",
        image: "/products/soft-drinks.png",
      },
      {
        name: "Biscuit Pack",
        quantity: "1",
        unitPrice: "8.75 CDF",
        total: "8.75 CDF",
        image: "/products/biscuit-pack.png",
      },
    ],
    subtotal: "42.75 CDF",
    deliveryFee: "0 CDF",
    discount: "0 CDF",
    paymentStatus: "Collected",
  },
];

const baseTimeline = [
  "Order placed",
  "Waiting for confirmation",
  "Preparing",
  "Ready for pickup",
  "In delivery",
  "Delivered",
];

function normalizeOrderId(orderId: string): string {
  return orderId.replace(/^#/, "");
}

function getDisplayOrderNumber(index: number): string {
  return `#${3291 + Math.max(index, 0)}`;
}

function getOrder(orderId: string): OrderDetails {
  const normalized = normalizeOrderId(orderId);
  const match = orders.find((order) => normalizeOrderId(order.id) === normalized);
  return formatOrderDetailsCurrency(match ?? { ...orders[0], id: `#${normalized || "3291"}` });
}

function parseCurrencyAmount(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatOrderDetailsCurrency(order: OrderDetails): OrderDetails {
  return {
    ...order,
    total: formatCDF(order.total),
    subtotal: formatCDF(order.subtotal),
    deliveryFee: formatCDF(order.deliveryFee),
    discount: formatCDF(order.discount),
    products: order.products.map((product) => ({
      ...product,
      unitPrice: formatCDF(product.unitPrice),
      total: formatCDF(product.total),
    })),
  };
}

function buildStoreOrderFromDetails(order: OrderDetails): Order {
  return {
    id: normalizeOrderId(order.id),
    store: order.store,
    status: order.status,
    stockDeducted: order.status !== "Pending" && order.status !== "Confirmed",
    amount: parseCurrencyAmount(order.total),
    paymentMethod: order.paymentMethod,
    itemsCount:
      order.products.reduce((total, product) => total + Number(product.quantity || 0), 0) ||
      order.products.length,
    time: order.time,
    products: order.products.map((product) => ({
      name: product.name,
      detail: product.quantity,
      quantity: Number(product.quantity) || 1,
      amount: product.total,
      image: product.image,
    })),
  };
}

function getActions(status: OrderStatus): {
  secondary: string;
  primary: string;
  primaryTone: PrimaryActionTone;
} {
  if (status === "Confirmed") {
    return { secondary: "View Products", primary: "Prepare Order", primaryTone: "blue" };
  }
  if (status === "Preparing" || status === "Packed") {
    return { secondary: "View Products", primary: "Mark Ready", primaryTone: "blue" };
  }
  if (status === "Ready for Pickup") {
    return { secondary: "View Products", primary: "Send to Delivery", primaryTone: "blue" };
  }
  if (status === "In Transit") {
    return { secondary: "Contact Driver", primary: "Mark Delivered", primaryTone: "blue" };
  }
  if (status === "Delivered") {
    return { secondary: "Support", primary: "Share Receipt", primaryTone: "blue" };
  }
  return { secondary: "Cancel", primary: "Confirm Order", primaryTone: "orange" };
}

function getTimeline(status: OrderStatus): TimelineItem[] {
  const currentIndex =
    status === "Confirmed"
      ? 2
      : status === "Preparing" || status === "Packed"
        ? 2
        : status === "Ready for Pickup"
          ? 3
          : status === "In Transit"
            ? 4
            : status === "Delivered"
              ? 5
              : 1;

  return baseTimeline.map((label, index) => ({
    label,
    state: index < currentIndex || status === "Delivered" ? "completed" : index === currentIndex ? "current" : "pending",
  }));
}

function productInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] ?? "P"}${words[1]?.[0] ?? ""}`.toUpperCase();
}

function ProductImage({ product }: { product: OrderedProduct }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      {product.image && !imageFailed ? (
        <img
          src={product.image}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain p-2"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-xs font-black text-blue-400">{productInitials(product.name)}</span>
      )}
    </div>
  );
}

function TimelineIcon({ state }: { state: TimelineState }) {
  if (state === "completed") return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (state === "current") return <CircleDot className="h-5 w-5 text-orange-400" />;
  return <Circle className="h-5 w-5 text-slate-600" />;
}

function getSuccessMessage(status: OrderStatus): string | null {
  if (status === "Pending") return "Order confirmed successfully";
  if (status === "Confirmed") return "Order is now being prepared";
  if (status === "Preparing" || status === "Packed") return "Order marked ready for pickup";
  if (status === "Ready for Pickup") return "Order sent to delivery";
  if (status === "In Transit") return "Order marked as delivered";
  return null;
}

function getNextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "Pending") return "Confirmed";
  if (status === "Confirmed") return "Preparing";
  if (status === "Preparing" || status === "Packed") return "Ready for Pickup";
  if (status === "Ready for Pickup") return "In Transit";
  if (status === "In Transit") return "Delivered";
  return null;
}

export default function MobileOrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = decodeURIComponent(params.orderId ?? "3291").replace(/^#/, "");
  const { advanceOrderStatus, error, getOrderById, orders: storedOrders } = useMobileOrders();
  const storedOrder = getOrderById(orderId);
  const order = storedOrder ? buildOrderDetailsFromStore(storedOrder) : getOrder(orderId);
  const fallbackOrder = storedOrder ?? buildStoreOrderFromDetails(order);
  const currentStatus = storedOrder?.status ?? order.status;
  const orderIndex = storedOrders.findIndex(
    (storedOrderItem) => normalizeOrderId(storedOrderItem.id) === orderId
  );
  const displayOrderNumber = getDisplayOrderNumber(orderIndex);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDelivered = currentStatus === "Delivered";
  const actions = getActions(currentStatus);
  const timeline = getTimeline(currentStatus);
  const visibleError = actionError ?? error;

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

  async function handlePrimaryAction() {
    setActionError(null);
    setSuccessMessage(null);
    const message = getSuccessMessage(currentStatus);
    const nextStatus = getNextStatus(currentStatus);

    if (nextStatus) {
      const result = await advanceOrderStatus(orderId, fallbackOrder);

      if (result.success && message) {
        showSuccessMessage(message);
        return;
      }

      if (result.error) {
        setActionError(result.error);
      }
    }
  }

  return (
    <MobilePageShell active="orders">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/mobile-orders"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
          aria-label="Back to orders"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-lg font-black text-white">{isDelivered ? "Receipt" : "Order Details"}</p>
          <p className="text-xs text-slate-500">{isDelivered ? "Completed order" : "Zando"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-slate-300"
            type="button"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-[#06111d]" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-orange-500 to-slate-900 text-sm font-bold">
            PS
          </div>
        </div>
      </header>

      <main className="mt-6 space-y-4 pb-72">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-100">{successMessage}</p>
            </div>
          </div>
        ) : null}

        {visibleError ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
            {visibleError}
          </div>
        ) : null}

        <SectionCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.24em] text-blue-400">Order Summary</p>
              <h1 className="mt-3 text-3xl font-black text-white">
                Order {displayOrderNumber}
              </h1>
              <p className="mt-2 text-lg font-bold text-white">{order.store}</p>
            </div>
            <StatusBadge status={currentStatus} />
          </div>

          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm">
            <p className="flex items-center gap-2 text-slate-300">
              <MapPin className="h-4 w-4 text-blue-400" />
              {order.location}
            </p>
            <p className="flex items-center gap-2 text-slate-300">
              <Clock3 className="h-4 w-4 text-orange-400" />
              {order.time}
            </p>
            <p className="flex items-center gap-2 text-slate-300">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              {order.paymentMethod}
            </p>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <span className="text-slate-400">Total</span>
              <span className="text-xl font-black text-emerald-400">{order.total}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-xl font-bold text-white">Customer / Store</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p className="font-bold text-white">{order.store}</p>
            <p>Phone: {order.phone}</p>
            <p>Address: {order.address}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white" type="button">
              <Phone className="h-4 w-4" />
              Call
            </button>
            <button className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200" type="button">
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-xl font-bold text-white">Products</h2>
          <div className="mt-4 space-y-3">
            {order.products.map((product) => (
              <div key={product.name} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                <div className="flex gap-3">
                  <ProductImage product={product} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{product.name}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Qty</p>
                        <p className="mt-1 font-semibold text-white">{product.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Unit</p>
                        <p className="mt-1 font-semibold text-white">{product.unitPrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="mt-1 font-bold text-emerald-400">{product.total}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <h2 className="text-xl font-bold text-white">Payment Breakdown</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-bold text-white">{order.subtotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Delivery fee</span>
              <span className="font-bold text-white">{order.deliveryFee}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Discount</span>
              <span className="font-bold text-white">{order.discount}</span>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Total</span>
                <span className="text-2xl font-black text-emerald-400">{order.total}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-slate-400">Payment status</span>
                <StatusBadge status={isDelivered ? "Paid" : order.paymentStatus} />
              </div>
              {isDelivered ? (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-400">Delivery status</span>
                  <StatusBadge status="Delivered" />
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>

        {!isDelivered ? (
          <SectionCard className="p-5">
            <h2 className="text-xl font-bold text-white">Order Timeline</h2>
            <div className="mt-4 space-y-4">
              {timeline.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <TimelineIcon state={item.state} />
                  <p
                    className={`text-sm font-semibold ${
                      item.state === "completed"
                        ? "text-emerald-400"
                        : item.state === "current"
                          ? "text-orange-400"
                          : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {isDelivered ? (
          <SectionCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white">Receipt ready</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This order has been delivered and marked as completed.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Receipt ID</span>
                <span className="font-bold text-white">
                  RCP-{displayOrderNumber.replace(/^#/, "")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Completed</span>
                <span className="font-bold text-white">Today</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Payment</span>
                <span className="font-bold text-white">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Status</span>
                <StatusBadge status="Paid" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </SectionCard>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-[6.75rem] z-40 mx-auto max-w-[520px] border-t border-white/10 bg-[#07111c]/95 px-5 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
          <button
            type="button"
            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200"
          >
            {actions.secondary}
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            className={`min-h-12 rounded-2xl px-4 text-sm font-bold text-white ${
              actions.primaryTone === "orange" ? "bg-orange-600" : "bg-blue-600"
            }`}
          >
            {actions.primary}
          </button>
        </div>
      </div>
    </MobilePageShell>
  );
}
