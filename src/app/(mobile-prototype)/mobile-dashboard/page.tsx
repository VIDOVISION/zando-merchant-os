"use client";

import { Box, ChevronRight, DollarSign, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  MobilePageShell,
  ProductListItem,
  SectionCard,
  TopHeader,
} from "@/components/mobile-prototype/components";
import type { ProductLine, Tone } from "@/components/mobile-prototype/mock-data";
import { createClient } from "@/lib/supabase/client";
import { NewOrderModal } from "../_components/NewOrderModal";

type EffectiveOrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready for Pickup"
  | "In Transit"
  | "Delivered"
  | "Cancelled";
type TaskTone = "blue" | "green" | "orange" | "red";

interface SupplierOrderRow {
  id: string;
  supplier_name: string;
  status: string;
  total_amount: number | string | null;
  notes: string | null;
  created_at: string;
}

interface SupplierOrderItemRow {
  supplier_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  total?: number | string | null;
}

interface InventoryItemRow {
  id: string;
  name: string;
  category?: string | null;
  pack_size?: string | null;
  stock_on_hand: number | string | null;
  selling_price: number | string | null;
  unit_price: number | string | null;
}

interface QuickSaleForm {
  customerName: string;
  paymentStatus: "collected" | "pending_collection";
  productId: string;
  productSearch: string;
  quantity: string;
}

interface TodayTask {
  title: string;
  value: string;
  action: string;
  href: string;
  tone: TaskTone;
}

interface DashboardNotification {
  title: string;
  body: string;
  action: string;
  href: string;
  tone: TaskTone;
}

const MOBILE_STATUS_NOTE_PREFIX = "mobile_status=";
const PAYMENT_STATUS_NOTE_PREFIX = "payment_status=";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const taskToneStyles: Record<TaskTone, { text: string; bg: string; border: string }> = {
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-400/20",
  },
  green: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-400/20",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-400/20",
  },
  red: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-400/20",
  },
};

function splitNotes(notes?: string | null): string[] {
  return (notes ?? "")
    .split(";")
    .map((note) => note.trim())
    .filter(Boolean);
}

function getEffectiveStatus(order: SupplierOrderRow): EffectiveOrderStatus {
  const mobileStatusNote = splitNotes(order.notes).find((note) =>
    note.startsWith(MOBILE_STATUS_NOTE_PREFIX)
  );
  const mobileStatus = mobileStatusNote?.replace(MOBILE_STATUS_NOTE_PREFIX, "");

  if (
    mobileStatus === "Pending" ||
    mobileStatus === "Confirmed" ||
    mobileStatus === "Preparing" ||
    mobileStatus === "Ready for Pickup" ||
    mobileStatus === "In Transit" ||
    mobileStatus === "Delivered" ||
    mobileStatus === "Cancelled"
  ) {
    return mobileStatus;
  }

  if (order.status === "Draft") return "Pending";
  if (order.status === "Packed") return "Preparing";
  if (
    order.status === "Pending" ||
    order.status === "Confirmed" ||
    order.status === "In Transit" ||
    order.status === "Delivered" ||
    order.status === "Cancelled"
  ) {
    return order.status;
  }

  return "Pending";
}

function getPaymentStatus(notes?: string | null): "pending_collection" | "collected" {
  const paymentStatusNote = splitNotes(notes).find((note) =>
    note.startsWith(PAYMENT_STATUS_NOTE_PREFIX)
  );
  const paymentStatus = paymentStatusNote?.replace(PAYMENT_STATUS_NOTE_PREFIX, "");
  return paymentStatus === "collected" ? "collected" : "pending_collection";
}

function getNumber(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCDF(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat("fr-CD").format(getNumber(value))} CDF`;
}

function isToday(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
}

function getDayIndex(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getOrderAmount(order: SupplierOrderRow): number {
  return getNumber(order.total_amount);
}

function getInventoryStock(item: InventoryItemRow): number {
  return getNumber(item.stock_on_hand);
}

function getInventorySellingPrice(item: InventoryItemRow): number {
  return getNumber(item.selling_price || item.unit_price);
}

function buildQuickSaleNotes(paymentStatus: QuickSaleForm["paymentStatus"]): string {
  return [
    "mobile_status=Delivered",
    "stock_deducted=true",
    "quick_sale=true",
    `payment_status=${paymentStatus}`,
    "order_type=quick_sale",
  ].join(";");
}

function logDashboardLoadError(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error("Dashboard load error:", error);
  }
}

function CompactDeliveredSummary({
  total,
  weeklyValues,
}: {
  total: number;
  weeklyValues: number[];
}) {
  const maxValue = Math.max(...weeklyValues, 1);

  return (
    <SectionCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Delivered Value</h2>
          <p className="mt-1 text-sm text-slate-400">This week</p>
        </div>
        <p className="text-right text-lg font-black text-emerald-400">{formatCDF(total)}</p>
      </div>
      <div className="mt-4 flex h-24 items-end gap-2">
        {weeklyValues.map((value, index) => (
          <div
            key={`${DAYS[index]}-${value}`}
            className="flex-1 rounded-t-xl bg-blue-600/80"
            style={{ height: `${Math.max(8, (value / maxValue) * 100)}%` }}
            title={formatCDF(value)}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-slate-500">
        {DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
    </SectionCard>
  );
}

function QuickSaleSheet({
  customerSuggestions,
  error,
  form,
  inventoryItems,
  onCancel,
  onChange,
  onSave,
  saving,
}: {
  customerSuggestions: string[];
  error: string | null;
  form: QuickSaleForm;
  inventoryItems: InventoryItemRow[];
  onCancel: () => void;
  onChange: (field: keyof QuickSaleForm, value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const productSearch = form.productSearch.trim().toLowerCase();
  const matchingProducts = inventoryItems
    .filter((item) =>
      productSearch
        ? `${item.name} ${item.category ?? ""}`.toLowerCase().includes(productSearch)
        : true
    )
    .slice(0, 8);
  const selectedProduct = inventoryItems.find((item) => item.id === form.productId) ?? null;
  const quantity = Math.max(0, Math.floor(getNumber(form.quantity)));
  const total = selectedProduct ? quantity * getInventorySellingPrice(selectedProduct) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#07111c] p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Quick Sale</h2>
            <p className="mt-1 text-sm text-slate-400">Record a depot sale already completed.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-300 disabled:opacity-50"
            aria-label="Close quick sale"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Customer / Boutique
            </span>
            <input
              value={form.customerName}
              onChange={(event) => onChange("customerName", event.target.value)}
              list="quick-sale-customer-suggestions"
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              placeholder="Walk-in Customer"
            />
            <datalist id="quick-sale-customer-suggestions">
              {customerSuggestions.map((customer) => (
                <option key={customer} value={customer} />
              ))}
            </datalist>
          </label>

          <section>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Product
            </span>
            <label className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={form.productSearch}
                onChange={(event) => {
                  onChange("productId", "");
                  onChange("productSearch", event.target.value);
                }}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                placeholder="Search inventory..."
              />
            </label>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
              {matchingProducts.map((item) => {
                const selected = item.id === form.productId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange("productSearch", item.name);
                      onChange("productId", item.id);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left ${
                      selected
                        ? "border-blue-400/30 bg-blue-600/15"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Intl.NumberFormat("fr-CD").format(getInventoryStock(item))} packages
                          in stock
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-emerald-400">
                        {formatCDF(getInventorySellingPrice(item))}
                      </p>
                    </div>
                  </button>
                );
              })}
              {matchingProducts.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-sm text-slate-400">
                  No products found.
                </p>
              ) : null}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Quantity
              </span>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(event) => onChange("quantity", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Payment
              </span>
              <select
                value={form.paymentStatus}
                onChange={(event) =>
                  onChange(
                    "paymentStatus",
                    event.target.value === "pending_collection" ? "pending_collection" : "collected"
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none focus:border-blue-400/40"
              >
                <option value="collected">Collected now</option>
                <option value="pending_collection">To collect</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300/80">
              Total
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-300">{formatCDF(total)}</p>
            {selectedProduct ? (
              <p className="mt-1 text-sm text-slate-300">
                {quantity || 0} packages x {formatCDF(getInventorySellingPrice(selectedProduct))}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsSheet({
  notifications,
  onClose,
}: {
  notifications: DashboardNotification[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[1.75rem] border border-white/10 bg-[#07111c] p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Notifications</h2>
            <p className="mt-1 text-sm text-slate-400">
              Actions that need attention today.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300"
            aria-label="Close notifications"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const tone = taskToneStyles[notification.tone];

              return (
                <div
                  key={notification.title}
                  className={`rounded-2xl border bg-white/[0.025] p-4 ${tone.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-white">{notification.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-300">{notification.body}</p>
                    </div>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.bg}`} />
                  </div>
                  <Link
                    href={notification.href}
                    onClick={onClose}
                    className={`mt-4 flex min-h-11 items-center justify-center rounded-2xl border px-4 text-sm font-black ${tone.border} ${tone.bg} ${tone.text}`}
                  >
                    {notification.action}
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-lg font-black text-white">All clear</p>
              <p className="mt-1 text-sm text-slate-300">No urgent actions right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileMenuSheet({
  onBusinessProfile,
  onClose,
  onLogout,
  onSettings,
  onSwitchRole,
}: {
  onBusinessProfile: () => void;
  onClose: () => void;
  onLogout: () => void;
  onSettings: () => void;
  onSwitchRole: () => void;
}) {
  const actions = [
    { label: "Business Profile", onClick: onBusinessProfile },
    { label: "Settings", onClick: onSettings },
    { label: "Switch Role", onClick: onSwitchRole },
    { label: "Logout", onClick: onLogout },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-[1.75rem] border border-white/10 bg-[#07111c] p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Patrice&apos;s Shop</h2>
            <p className="mt-1 text-sm text-slate-400">Supplier account</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300"
            aria-label="Close profile menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Store name</span>
              <span className="text-right font-bold text-white">Patrice&apos;s Shop</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Role</span>
              <span className="text-right font-bold text-white">Supplier / Grossiste</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Location</span>
              <span className="text-right font-bold text-white">Kinshasa</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Status</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="relative z-10 flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 text-left text-sm font-bold text-white"
            >
              {action.label}
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MobileDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<SupplierOrderItemRow[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [quickSaleForm, setQuickSaleForm] = useState<QuickSaleForm>({
    customerName: "Walk-in Customer",
    paymentStatus: "collected",
    productId: "",
    productSearch: "",
    quantity: "1",
  });
  const [quickSaleError, setQuickSaleError] = useState<string | null>(null);
  const [savingQuickSale, setSavingQuickSale] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        logDashboardLoadError(userError ?? new Error("No authenticated user."));
        setOrders([]);
        setOrderItems([]);
        setInventoryItems([]);
        setError("Could not load dashboard.");
        setLoading(false);
        return;
      }

      const ordersResult = await supabase
        .from("supplier_orders")
        .select("id, supplier_name, status, total_amount, notes, created_at")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (ordersResult.error) {
        logDashboardLoadError(ordersResult.error);
        setOrders([]);
        setOrderItems([]);
        setInventoryItems([]);
        setError("Could not load dashboard.");
        setLoading(false);
        return;
      }

      const loadedOrders = (ordersResult.data as SupplierOrderRow[] | null) ?? [];
      setOrders(loadedOrders);
      setError(null);

      const inventoryResult = await supabase
        .from("inventory_items")
        .select("id, name, category, pack_size, stock_on_hand, selling_price, unit_price")
        .eq("merchant_id", user.id)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (inventoryResult.error) {
        logDashboardLoadError(inventoryResult.error);
        setInventoryItems([]);
      } else {
        setInventoryItems((inventoryResult.data as InventoryItemRow[] | null) ?? []);
      }

      let loadedOrderItems: SupplierOrderItemRow[] = [];
      const itemsResult = await supabase
        .from("supplier_order_items")
        .select("supplier_order_id, product_id, name, quantity, unit_price")
        .eq("merchant_id", user.id);

      if (cancelled) return;

      if (itemsResult.error) {
        logDashboardLoadError(itemsResult.error);
      } else {
        loadedOrderItems = (itemsResult.data as SupplierOrderItemRow[] | null) ?? [];
      }

      setOrderItems(loadedOrderItems);
      setLoading(false);
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const customerSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .map((order) => order.supplier_name?.trim())
            .filter((customer): customer is string => Boolean(customer))
        )
      ).slice(0, 12),
    [orders]
  );

  function resetQuickSaleForm() {
    setQuickSaleForm({
      customerName: "Walk-in Customer",
      paymentStatus: "collected",
      productId: "",
      productSearch: "",
      quantity: "1",
    });
    setQuickSaleError(null);
  }

  function openQuickSale() {
    resetQuickSaleForm();
    setShowQuickSale(true);
  }

  function closeQuickSale() {
    if (savingQuickSale) return;
    setShowQuickSale(false);
    setQuickSaleError(null);
  }

  function handleProfileToastAction(nextMessage: string) {
    setShowProfileMenu(false);
    setMessage(nextMessage);
  }

  function handleProfileLogout() {
    setShowProfileMenu(false);
    router.push("/login");
  }

  function updateQuickSaleForm(field: keyof QuickSaleForm, value: string) {
    setQuickSaleForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function openNewOrder() {
    setShowNewOrder(true);
  }

  async function rollbackQuickSaleStock(productId: string, merchantId: string, stockOnHand: number) {
    const { error: rollbackError } = await supabase
      .from("inventory_items")
      .update({
        stock_on_hand: stockOnHand,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("merchant_id", merchantId);

    if (rollbackError) {
      logDashboardLoadError(rollbackError);
    }
  }

  async function saveQuickSale() {
    const customerName = quickSaleForm.customerName.trim();
    const selectedProduct = inventoryItems.find((item) => item.id === quickSaleForm.productId);
    const quantity = Math.floor(getNumber(quickSaleForm.quantity));

    if (!customerName) {
      setQuickSaleError("Customer name is required.");
      return;
    }

    if (!selectedProduct) {
      setQuickSaleError("Select a product.");
      return;
    }

    if (quantity <= 0) {
      setQuickSaleError("Quantity must be at least 1.");
      return;
    }

    const currentStock = getInventoryStock(selectedProduct);
    if (quantity > currentStock) {
      setQuickSaleError(`Only ${new Intl.NumberFormat("fr-CD").format(currentStock)} packages available.`);
      return;
    }

    const sellingPrice = getInventorySellingPrice(selectedProduct);
    if (sellingPrice <= 0) {
      setQuickSaleError("Selling price is required.");
      return;
    }

    setSavingQuickSale(true);
    setQuickSaleError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logDashboardLoadError(userError ?? new Error("No authenticated user."));
      setQuickSaleError("Could not add sale");
      setSavingQuickSale(false);
      return;
    }

    const merchantId = user.id;
    const totalAmount = quantity * sellingPrice;
    const nextStock = currentStock - quantity;
    const now = new Date().toISOString();
    const orderId = `quick-sale-${crypto.randomUUID()}`;
    const reference = orderId;
    const notes = buildQuickSaleNotes(quickSaleForm.paymentStatus);

    try {
      const { data: stockUpdateRows, error: stockUpdateError } = await supabase
        .from("inventory_items")
        .update({
          stock_on_hand: nextStock,
          updated_at: now,
        })
        .eq("id", selectedProduct.id)
        .eq("merchant_id", merchantId)
        .eq("stock_on_hand", currentStock)
        .select("id");

      if (stockUpdateError || !stockUpdateRows || stockUpdateRows.length === 0) {
        throw new Error(stockUpdateError?.message ?? "Could not update stock.");
      }

      const orderRow = {
        id: orderId,
        merchant_id: merchantId,
        reference,
        supplier_name: customerName,
        status: "Delivered",
        source: "Home",
        source_detail: "manual-new-order",
        delivery_address: "Depot quick sale",
        notes,
        total_amount: totalAmount,
        created_at: now,
        eta_at: null,
        updated_at: now,
      };

      const { error: orderInsertError } = await supabase
        .from("supplier_orders")
        .insert(orderRow);

      if (orderInsertError) {
        await rollbackQuickSaleStock(selectedProduct.id, merchantId, currentStock);
        throw new Error(orderInsertError.message);
      }

      const orderItemRow = {
        id: `${orderId}:item:1`,
        merchant_id: merchantId,
        supplier_order_id: orderId,
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        supplier: "Zando",
        quantity,
        unit_price: sellingPrice,
        pack_size: selectedProduct.pack_size ?? "package",
        created_at: now,
      };

      const { error: itemInsertError } = await supabase
        .from("supplier_order_items")
        .insert(orderItemRow);

      if (itemInsertError) {
        await supabase.from("supplier_orders").delete().eq("id", orderId).eq("merchant_id", merchantId);
        await rollbackQuickSaleStock(selectedProduct.id, merchantId, currentStock);
        throw new Error(itemInsertError.message);
      }

      setInventoryItems((currentItems) =>
        currentItems.map((item) =>
          item.id === selectedProduct.id ? { ...item, stock_on_hand: nextStock } : item
        )
      );
      setOrders((currentOrders) => [orderRow, ...currentOrders]);
      setOrderItems((currentItems) => [
        {
          supplier_order_id: orderId,
          product_id: selectedProduct.id,
          name: selectedProduct.name,
          quantity,
          unit_price: sellingPrice,
          total: totalAmount,
        },
        ...currentItems,
      ]);
      setMessage("Sale added");
      setShowQuickSale(false);
      resetQuickSaleForm();
    } catch (quickSaleSaveError) {
      logDashboardLoadError(quickSaleSaveError);
      setQuickSaleError("Could not add sale");
    } finally {
      setSavingQuickSale(false);
    }
  }

  const dashboardData = useMemo(() => {
    const pendingOrders = orders.filter((order) => getEffectiveStatus(order) === "Pending");
    const confirmedOrders = orders.filter((order) => getEffectiveStatus(order) === "Confirmed");
    const readyForPickupOrders = orders.filter(
      (order) => getEffectiveStatus(order) === "Ready for Pickup"
    );
    const inTransitOrders = orders.filter((order) => getEffectiveStatus(order) === "In Transit");
    const deliveredOrders = orders.filter((order) => getEffectiveStatus(order) === "Delivered");
    const todayOrders = orders.filter((order) => isToday(order.created_at));
    const lowStockItems = inventoryItems.filter((item) => getInventoryStock(item) <= 10);
    const collectedDeliveredOrders = deliveredOrders.filter(
      (order) => getPaymentStatus(order.notes) === "collected"
    );
    const pendingCollectionOrders = deliveredOrders.filter(
      (order) => getPaymentStatus(order.notes) !== "collected"
    );
    const todayDeliveredOrders = deliveredOrders.filter((order) => isToday(order.created_at));
    const availableAmount = collectedDeliveredOrders.reduce(
      (total, order) => total + getOrderAmount(order),
      0
    );
    const pendingAmount = pendingCollectionOrders.reduce(
      (total, order) => total + getOrderAmount(order),
      0
    );
    const todayAmount = todayDeliveredOrders.reduce(
      (total, order) => total + getOrderAmount(order),
      0
    );
    const deliveredTotal = deliveredOrders.reduce((total, order) => total + getOrderAmount(order), 0);
    const deliveredOrderIds = new Set(deliveredOrders.map((order) => order.id));
    const weeklyValues = Array.from({ length: 7 }, () => 0);

    for (const order of deliveredOrders) {
      weeklyValues[getDayIndex(order.created_at)] += getOrderAmount(order);
    }

    const productMap = new Map<string, { quantity: number; value: number }>();

    for (const item of orderItems) {
      if (!deliveredOrderIds.has(item.supplier_order_id)) continue;

      const name = item.name?.trim() || "Unknown product";
      const quantity = getNumber(item.quantity);
      const lineTotal = getNumber(item.total) || quantity * getNumber(item.unit_price);
      const current = productMap.get(name) ?? { quantity: 0, value: 0 };
      productMap.set(name, {
        quantity: current.quantity + quantity,
        value: current.value + lineTotal,
      });
    }

    const topProducts: ProductLine[] = Array.from(productMap.entries())
      .sort((first, second) => second[1].value - first[1].value)
      .slice(0, 3)
      .map(([name, product]) => ({
        name,
        detail: `${new Intl.NumberFormat("fr-CD").format(product.quantity)} sold`,
        amount: formatCDF(product.value),
        tone: "blue" as Tone,
      }));
    const notifications: DashboardNotification[] = [];

    if (pendingOrders.length > 0) {
      notifications.push({
        title: "Orders need confirmation",
        body: `${pendingOrders.length} orders waiting for confirmation`,
        action: "Review Orders",
        href: "/mobile-orders",
        tone: "orange",
      });
    }

    if (readyForPickupOrders.length > 0) {
      notifications.push({
        title: "Pickups ready",
        body: `${readyForPickupOrders.length} orders ready for pickup`,
        action: "Go to Deliveries",
        href: "/mobile-deliveries",
        tone: "blue",
      });
    }

    if (lowStockItems.length > 0) {
      notifications.push({
        title: "Low stock alert",
        body: `${lowStockItems.length} products need restocking`,
        action: "View Stock",
        href: "/mobile-inventory?filter=low-stock",
        tone: "red",
      });
    }

    if (pendingAmount > 0) {
      notifications.push({
        title: "Cash to collect",
        body: `${formatCDF(pendingAmount)} pending collection`,
        action: "View Finances",
        href: "/mobile-finances",
        tone: "green",
      });
    }

    return {
      availableAmount,
      deliveredTotal,
      homeStats: [
        {
          label: "New Orders",
          value: String(todayOrders.length || pendingOrders.length + confirmedOrders.length),
          tone: "text-blue-400",
        },
        {
          label: "Pending Deliveries",
          value: String(readyForPickupOrders.length + inTransitOrders.length),
          tone: "text-emerald-400",
        },
        {
          label: "Low Stock",
          value: String(lowStockItems.length),
          tone: "text-orange-400",
        },
      ],
      lowStockItems,
      notifications,
      pendingAmount,
      tasks: [
        {
          title: "Confirm orders",
          value: String(pendingOrders.length),
          action: "Review Orders",
          href: "/mobile-orders",
          tone: "orange" as TaskTone,
        },
        {
          title: "Prepare pickups",
          value: String(readyForPickupOrders.length),
          action: "Prepare Pickup",
          href: "/mobile-deliveries",
          tone: "blue" as TaskTone,
        },
        {
          title: "Restock products",
          value: String(lowStockItems.length),
          action: "Restock Items",
          href: "/mobile-inventory",
          tone: "red" as TaskTone,
        },
        {
          title: "Collect cash",
          value: formatCDF(pendingAmount),
          action: "View Payments",
          href: "/mobile-finances",
          tone: "green" as TaskTone,
        },
      ] satisfies TodayTask[],
      todayAmount,
      topProducts,
      weeklyValues,
    };
  }, [inventoryItems, orderItems, orders]);

  return (
    <MobilePageShell active="dashboard">
      <TopHeader
        notificationCount={dashboardData.notifications.length}
        onNotificationsClick={() => setShowNotifications(true)}
        onProfileClick={() => setShowProfileMenu(true)}
      />

      <main className="mt-8 space-y-4 pb-40">
        <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20">
          <p className="text-2xl font-bold leading-tight text-white">
            Hi, Patrice&apos;s Shop!
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Your weekly performance overview.
          </p>

          <div className="mt-4 grid grid-cols-[1.25fr_0.75fr] gap-3">
            <button
              type="button"
              onClick={openQuickSale}
              className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
            >
              + Add Sale
            </button>
            <button
              type="button"
              onClick={openNewOrder}
              className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200"
            >
              New Order
            </button>
          </div>
        </section>

        {message ? (
          <SectionCard className="border-blue-400/20 bg-blue-500/10 p-4 text-sm font-semibold text-blue-100">
            {message}
          </SectionCard>
        ) : null}

        {loading ? (
          <SectionCard className="p-5 text-sm font-semibold text-slate-300">
            Loading dashboard...
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-100">
            Could not load dashboard.
          </SectionCard>
        ) : null}

        <SectionCard className="p-4">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-white">Today&apos;s Tasks</h2>
            <p className="mt-1 text-sm text-slate-400">Priority actions for today.</p>
          </div>
          <div className="space-y-2">
            {dashboardData.tasks.map((task) => {
              const tone = taskToneStyles[task.tone];
              return (
                <Link
                  key={task.title}
                  href={task.href}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-white/[0.025] px-3 py-2.5 ${tone.border}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 min-w-9 items-center justify-center rounded-xl ${tone.bg}`}>
                      <span className={`max-w-[4.5rem] truncate text-sm font-black ${tone.text}`}>
                        {task.value}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{task.title}</p>
                      <p className={`mt-0.5 text-xs font-semibold ${tone.text}`}>{task.action}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <section className="grid grid-cols-3 gap-2">
          {dashboardData.homeStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
            >
              <p className="min-h-8 text-[11px] leading-4 text-slate-400">{stat.label}</p>
              <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
            </div>
          ))}
        </section>

        <SectionCard className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/15 text-fuchsia-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Money Today</h2>
              <p className="text-sm text-slate-400">Today&apos;s money situation</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-500">Available</p>
              <p className="mt-1 text-sm font-black text-emerald-400">
                {formatCDF(dashboardData.availableAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-500">Pending</p>
              <p className="mt-1 text-sm font-black text-orange-400">
                {formatCDF(dashboardData.pendingAmount)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[11px] text-slate-500">Today</p>
              <p className="mt-1 text-sm font-black text-blue-400">
                {formatCDF(dashboardData.todayAmount)}
              </p>
            </div>
          </div>
        </SectionCard>

        <CompactDeliveredSummary
          total={dashboardData.deliveredTotal}
          weeklyValues={dashboardData.weeklyValues}
        />

        <SectionCard className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Top Products</h2>
            <Link href="/mobile-product-insights" className="flex items-center gap-1 text-sm text-slate-300">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {dashboardData.topProducts.length > 0 ? (
            dashboardData.topProducts.map((product) => (
              <ProductListItem key={product.name} product={product} />
            ))
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
              No delivered product sales yet.
            </p>
          )}
        </SectionCard>

        <SectionCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Low Stock Alerts</h2>
            <Link href="/mobile-inventory?filter=low-stock" className="flex items-center gap-1 text-sm text-slate-300">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2">
            {dashboardData.lowStockItems.length > 0 ? (
              dashboardData.lowStockItems.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <Box className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-orange-400">
                      {new Intl.NumberFormat("fr-CD").format(getInventoryStock(product))} left
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
                No low stock items.
              </p>
            )}
          </div>
        </SectionCard>
      </main>

      {showQuickSale ? (
        <QuickSaleSheet
          customerSuggestions={customerSuggestions}
          error={quickSaleError}
          form={quickSaleForm}
          inventoryItems={inventoryItems}
          onCancel={closeQuickSale}
          onChange={updateQuickSaleForm}
          onSave={saveQuickSale}
          saving={savingQuickSale}
        />
      ) : null}

      {showNewOrder ? (
        <NewOrderModal
          customerSuggestions={customerSuggestions}
          onOpenChange={(open) => setShowNewOrder(open)}
          onOrderCreated={({ order, item }) => {
            setOrders((currentOrders) => [order, ...currentOrders]);
            setOrderItems((currentItems) => [item, ...currentItems]);
            setMessage("Order created");
          }}
          open={showNewOrder}
        />
      ) : null}

      {showNotifications ? (
        <NotificationsSheet
          notifications={dashboardData.notifications}
          onClose={() => setShowNotifications(false)}
        />
      ) : null}

      {showProfileMenu ? (
        <ProfileMenuSheet
          onBusinessProfile={() => handleProfileToastAction("Business profile coming soon")}
          onClose={() => setShowProfileMenu(false)}
          onLogout={handleProfileLogout}
          onSettings={() => handleProfileToastAction("Settings coming soon")}
          onSwitchRole={() => handleProfileToastAction("Role switching coming soon")}
        />
      ) : null}
    </MobilePageShell>
  );
}
