"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  MobilePageShell,
  SectionCard,
} from "@/components/mobile-prototype/components";
import { ShopNavigation } from "../_components/ShopNavigation";
import { createClient } from "@/lib/supabase/client";
import { formatCDF, getNumber } from "@/lib/zando-format";
import {
  clearShopCart,
  getShopCart,
  getShopCartItemsCount,
  getShopCartTotal,
  saveShopCart,
  type ZandoShopCartItem,
} from "@/lib/zando-shop-cart";

type ShopPaymentMethod =
  | "Cash on Delivery"
  | "Mobile Money"
  | "Bank Transfer"
  | "BNPL / Credit";

interface InventoryItemRow {
  id: string;
  name: string;
  stock_on_hand: number | string | null;
  selling_price: number | string | null;
  unit_price: number | string | null;
}

const paymentMethods: ShopPaymentMethod[] = [
  "Cash on Delivery",
  "Mobile Money",
  "Bank Transfer",
  "BNPL / Credit",
];

function getInventoryStock(item: InventoryItemRow): number {
  return getNumber(item.stock_on_hand);
}

function buildShopOrderNotes(paymentMethod: ShopPaymentMethod): string {
  return [
    "mobile_status=Pending",
    "order_type=shop_order",
    "source=shop_app",
    `payment_method=${paymentMethod}`,
  ].join(";");
}

function ShopCartHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link
        href="/mobile-shop"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
        aria-label="Back to shop"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <p className="text-lg font-black text-white">Cart</p>
        <p className="text-xs text-slate-500">Zando Shop</p>
      </div>
      <Link
        href="/mobile-role-select"
        className="flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-sm font-black text-slate-200"
      >
        Role
      </Link>
    </header>
  );
}

export default function MobileShopCartPage() {
  const [cart, setCart] = useState<ZandoShopCartItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [customerName, setCustomerName] = useState("Patrice Mini Market");
  const [paymentMethod, setPaymentMethod] =
    useState<ShopPaymentMethod>("Cash on Delivery");
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setCart(getShopCart());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setLoadingInventory(true);
      setError(null);

      const currentCart = getShopCart();
      const productIds = currentCart.map((item) => item.product_id);

      if (productIds.length === 0) {
        setInventoryItems([]);
        setLoadingInventory(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setInventoryItems([]);
        setError("Could not load current stock.");
        setLoadingInventory(false);
        return;
      }

      const { data, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, name, stock_on_hand, selling_price, unit_price")
        .eq("merchant_id", user.id)
        .in("id", productIds);

      if (cancelled) return;

      if (inventoryError) {
        setInventoryItems([]);
        setError("Could not load current stock.");
      } else {
        setInventoryItems((data as InventoryItemRow[] | null) ?? []);
      }

      setLoadingInventory(false);
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const inventoryById = useMemo(() => {
    return new Map(inventoryItems.map((item) => [item.id, item]));
  }, [inventoryItems]);
  const itemsCount = getShopCartItemsCount(cart);
  const orderTotal = getShopCartTotal(cart);

  function persistCart(nextCart: ZandoShopCartItem[]) {
    setCart(saveShopCart(nextCart));
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    const inventoryItem = inventoryById.get(productId);
    const availableStock = inventoryItem ? getInventoryStock(inventoryItem) : Number.POSITIVE_INFINITY;
    const safeQuantity = Math.max(1, Math.min(Math.floor(nextQuantity), availableStock));

    persistCart(
      cart.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: safeQuantity,
              total: safeQuantity * item.unit_price,
            }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    persistCart(cart.filter((item) => item.product_id !== productId));
  }

  async function placeOrder() {
    const trimmedCustomerName = customerName.trim();

    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }

    if (!trimmedCustomerName) {
      setError("Customer name is required.");
      return;
    }

    setPlacingOrder(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Could not place order.");
      setPlacingOrder(false);
      return;
    }

    const merchantId = user.id;
    const productIds = cart.map((item) => item.product_id);
    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("inventory_items")
      .select("id, name, stock_on_hand, selling_price, unit_price")
      .eq("merchant_id", merchantId)
      .in("id", productIds);

    if (inventoryError) {
      setError("Could not verify stock.");
      setPlacingOrder(false);
      return;
    }

    const latestInventoryById = new Map(
      ((inventoryRows as InventoryItemRow[] | null) ?? []).map((item) => [item.id, item])
    );

    for (const item of cart) {
      const inventoryItem = latestInventoryById.get(item.product_id);
      if (!inventoryItem) {
        setError(`Product not found for ${item.name}.`);
        setPlacingOrder(false);
        return;
      }

      const availableStock = getInventoryStock(inventoryItem);
      if (item.quantity > availableStock) {
        setError(
          `Only ${new Intl.NumberFormat("fr-CD").format(availableStock)} available for ${item.name}.`
        );
        setPlacingOrder(false);
        return;
      }
    }

    const now = new Date().toISOString();
    const orderId = `shop-order-${crypto.randomUUID()}`;
    const totalAmount = getShopCartTotal(cart);
    const notes = buildShopOrderNotes(paymentMethod);
    const orderRow = {
      id: orderId,
      merchant_id: merchantId,
      reference: orderId,
      supplier_name: trimmedCustomerName,
      status: "Pending",
      source: "Orders",
      source_detail: "manual-new-order",
      delivery_address: "Shop app order",
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

      const itemRows = cart.map((item, index) => ({
        id: `${orderId}:item:${index + 1}`,
        merchant_id: merchantId,
        supplier_order_id: orderId,
        product_id: item.product_id,
        name: item.name,
        supplier: "Zando",
        quantity: item.quantity,
        unit_price: item.unit_price,
        pack_size: "package",
        created_at: now,
      }));

      const { error: itemInsertError } = await supabase
        .from("supplier_order_items")
        .insert(itemRows);

      if (itemInsertError) {
        await supabase
          .from("supplier_orders")
          .delete()
          .eq("id", orderId)
          .eq("merchant_id", merchantId);
        throw new Error(itemInsertError.message);
      }

      clearShopCart();
      setCart([]);
      setSuccess(true);
    } catch {
      setError("Could not place order.");
    } finally {
      setPlacingOrder(false);
    }
  }

  if (success) {
    return (
      <MobilePageShell active="dashboard" hideBottomNav>
        <ShopCartHeader />

        <main className="mt-8 space-y-4 pb-32">
          <ShopNavigation />

          <SectionCard className="p-5">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-300">
              Success
            </p>
            <h1 className="mt-3 text-3xl font-black text-white">
              Order placed successfully
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Your supplier will confirm it soon.
            </p>
            <Link
              href="/mobile-shop"
              className="mt-6 flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
            >
              Back to Shop
            </Link>
          </SectionCard>
        </main>
      </MobilePageShell>
    );
  }

  return (
    <MobilePageShell active="dashboard" hideBottomNav>
      <ShopCartHeader />

      <main className="mt-8 space-y-4 pb-32">
        <ShopNavigation />

        <section>
          <h1 className="text-3xl font-black text-white">Shop Cart</h1>
          <p className="mt-2 text-base text-slate-300">
            Review your order before sending it to your supplier.
          </p>
        </section>

        {error ? (
          <SectionCard className="border-red-400/20 bg-red-500/10 p-4 text-sm font-semibold text-red-100">
            {error}
          </SectionCard>
        ) : null}

        <SectionCard className="p-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Customer / Boutique
            </span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
              placeholder="Patrice Mini Market"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Payment method
            </span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as ShopPaymentMethod)}
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-white outline-none focus:border-blue-400/40"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
        </SectionCard>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Items</h2>
            <p className="text-sm font-semibold text-slate-400">
              {itemsCount} {itemsCount === 1 ? "item" : "items"}
            </p>
          </div>

          {loadingInventory && cart.length > 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              Checking current stock...
            </SectionCard>
          ) : null}

          {cart.length === 0 ? (
            <SectionCard className="p-5 text-sm font-semibold text-slate-300">
              Your cart is empty.
            </SectionCard>
          ) : null}

          {cart.map((item) => {
            const inventoryItem = inventoryById.get(item.product_id);
            const availableStock = inventoryItem ? getInventoryStock(inventoryItem) : null;

            return (
              <SectionCard key={item.product_id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-white">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatCDF(item.unit_price)} per package
                    </p>
                    {availableStock !== null ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {new Intl.NumberFormat("fr-CD").format(availableStock)} available
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-10 min-w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] px-3 text-sm font-black text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200"
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-lg font-black text-emerald-400">
                    {formatCDF(item.total)}
                  </p>
                </div>
              </SectionCard>
            );
          })}
        </section>

        <SectionCard className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-400">Order total</span>
            <span className="text-2xl font-black text-emerald-400">
              {formatCDF(orderTotal)}
            </span>
          </div>
          <button
            type="button"
            onClick={placeOrder}
            disabled={placingOrder || cart.length === 0}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {placingOrder ? "Placing Order..." : "Place Order"}
          </button>
        </SectionCard>
      </main>
    </MobilePageShell>
  );
}
