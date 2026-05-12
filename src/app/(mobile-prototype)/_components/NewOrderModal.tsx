"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type NewOrderPaymentMethod =
  | "Cash on Delivery"
  | "Mobile Money"
  | "Bank Transfer"
  | "BNPL / Credit";

export interface CreatedSupplierOrder {
  id: string;
  supplier_name: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
}

export interface CreatedSupplierOrderItem {
  supplier_order_id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
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

interface NewOrderForm {
  customerName: string;
  paymentMethod: NewOrderPaymentMethod;
  productId: string;
  productSearch: string;
  quantity: string;
}

interface NewOrderModalProps {
  customerSuggestions?: string[];
  defaultCustomerName?: string;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: (payload: {
    order: CreatedSupplierOrder;
    item: CreatedSupplierOrderItem;
  }) => void;
  open: boolean;
}

function getNumber(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCDF(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat("fr-CD").format(getNumber(value))} CDF`;
}

function getInventoryStock(item: InventoryItemRow): number {
  return getNumber(item.stock_on_hand);
}

function getInventorySellingPrice(item: InventoryItemRow): number {
  return getNumber(item.selling_price || item.unit_price);
}

function buildNewOrderNotes(paymentMethod: NewOrderPaymentMethod): string {
  return [
    "mobile_status=Pending",
    "order_type=customer_order",
    `payment_method=${paymentMethod}`,
  ].join(";");
}

function getInitialForm(defaultCustomerName?: string): NewOrderForm {
  return {
    customerName: defaultCustomerName?.trim() ?? "",
    paymentMethod: "Cash on Delivery",
    productId: "",
    productSearch: "",
    quantity: "1",
  };
}

export function NewOrderModal({
  customerSuggestions = [],
  defaultCustomerName,
  onOpenChange,
  onOrderCreated,
  open,
}: NewOrderModalProps) {
  const [form, setForm] = useState<NewOrderForm>(() => getInitialForm(defaultCustomerName));
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadInventory() {
      setForm(getInitialForm(defaultCustomerName));
      setError(null);
      setLoadingInventory(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setInventoryItems([]);
        setError("Could not load products.");
        setLoadingInventory(false);
        return;
      }

      const { data, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, name, category, pack_size, stock_on_hand, selling_price, unit_price")
        .eq("merchant_id", user.id)
        .order("name", { ascending: true });

      if (cancelled) return;

      if (inventoryError) {
        setInventoryItems([]);
        setError("Could not load products.");
      } else {
        setInventoryItems((data as InventoryItemRow[] | null) ?? []);
      }

      setLoadingInventory(false);
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [defaultCustomerName, open, supabase]);

  if (!open) return null;

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

  function updateForm(field: keyof NewOrderForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function closeModal() {
    if (saving) return;
    onOpenChange(false);
  }

  async function saveOrder() {
    const customerName = form.customerName.trim();
    const product = inventoryItems.find((item) => item.id === form.productId);
    const orderQuantity = Math.floor(getNumber(form.quantity));

    if (!customerName) {
      setError("Customer name is required.");
      return;
    }

    if (!product) {
      setError("Select a product.");
      return;
    }

    if (orderQuantity <= 0) {
      setError("Quantity must be at least 1.");
      return;
    }

    const currentStock = getInventoryStock(product);
    if (orderQuantity > currentStock) {
      setError(`Only ${new Intl.NumberFormat("fr-CD").format(currentStock)} packages available.`);
      return;
    }

    const sellingPrice = getInventorySellingPrice(product);
    if (sellingPrice <= 0) {
      setError("Selling price is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Could not create order");
      setSaving(false);
      return;
    }

    const merchantId = user.id;
    const totalAmount = orderQuantity * sellingPrice;
    const now = new Date().toISOString();
    const orderId = `customer-order-${crypto.randomUUID()}`;
    const notes = buildNewOrderNotes(form.paymentMethod);
    const orderRow = {
      id: orderId,
      merchant_id: merchantId,
      reference: orderId,
      supplier_name: customerName,
      status: "Pending",
      source: "Home",
      source_detail: "manual-new-order",
      delivery_address: "Customer order pending processing",
      notes,
      total_amount: totalAmount,
      created_at: now,
      eta_at: null,
      updated_at: now,
    };

    try {
      const { error: orderInsertError } = await supabase
        .from("supplier_orders")
        .insert(orderRow);

      if (orderInsertError) throw new Error(orderInsertError.message);

      const itemRow = {
        id: `${orderId}:item:1`,
        merchant_id: merchantId,
        supplier_order_id: orderId,
        product_id: product.id,
        name: product.name,
        supplier: "Zando",
        quantity: orderQuantity,
        unit_price: sellingPrice,
        pack_size: product.pack_size ?? "package",
        created_at: now,
      };

      const { error: itemInsertError } = await supabase
        .from("supplier_order_items")
        .insert(itemRow);

      if (itemInsertError) {
        await supabase
          .from("supplier_orders")
          .delete()
          .eq("id", orderId)
          .eq("merchant_id", merchantId);
        throw new Error(itemInsertError.message);
      }

      onOrderCreated?.({
        order: {
          id: orderId,
          supplier_name: customerName,
          status: "Pending",
          total_amount: totalAmount,
          notes,
          created_at: now,
        },
        item: {
          supplier_order_id: orderId,
          product_id: product.id,
          name: product.name,
          quantity: orderQuantity,
          unit_price: sellingPrice,
          total: totalAmount,
        },
      });
      onOpenChange(false);
      setForm(getInitialForm(defaultCustomerName));
    } catch {
      setError("Could not create order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#07111c] p-5 shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">New Order</h2>
            <p className="mt-1 text-sm text-slate-400">
              Create a boutique order to confirm and prepare later.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-300 disabled:opacity-50"
            aria-label="Close new order"
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
              onChange={(event) => updateForm("customerName", event.target.value)}
              list="new-order-customer-suggestions"
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              placeholder="Boutique name"
            />
            <datalist id="new-order-customer-suggestions">
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
                  updateForm("productId", "");
                  updateForm("productSearch", event.target.value);
                }}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                placeholder={loadingInventory ? "Loading products..." : "Search inventory..."}
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
                      updateForm("productSearch", item.name);
                      updateForm("productId", item.id);
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
                          available
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-emerald-400">
                        {formatCDF(getInventorySellingPrice(item))}
                      </p>
                    </div>
                  </button>
                );
              })}
              {!loadingInventory && matchingProducts.length === 0 ? (
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
                onChange={(event) => updateForm("quantity", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Payment method
              </span>
              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  updateForm("paymentMethod", event.target.value as NewOrderPaymentMethod)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none focus:border-blue-400/40"
              >
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="BNPL / Credit">BNPL / Credit</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300/80">
              Total
            </p>
            <p className="mt-2 text-2xl font-black text-blue-300">{formatCDF(total)}</p>
            {selectedProduct ? (
              <p className="mt-1 text-sm text-slate-300">
                {quantity || 0} packages x {formatCDF(getInventorySellingPrice(selectedProduct))}
              </p>
            ) : null}
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Stock will be deducted later when this order moves to Preparing.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveOrder}
            disabled={saving || loadingInventory}
            className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
