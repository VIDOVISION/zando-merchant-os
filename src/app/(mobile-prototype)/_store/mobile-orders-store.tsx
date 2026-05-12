"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProductLine } from "@/components/mobile-prototype/mock-data";

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "Preparing"
  | "Ready for Pickup"
  | "In Transit"
  | "Delivered"
  | "Cancelled";

type SupabaseOrderStatus =
  | "Draft"
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "In Transit"
  | "Delivered"
  | "Cancelled";

interface SupplierOrderRow {
  id: string;
  merchant_id?: string;
  supplier_name: string;
  status: SupabaseOrderStatus;
  total_amount: number;
  created_at: string;
  notes: string | null;
}

interface SupplierOrderItemRow {
  supplier_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number | null;
  unit_price: number | null;
  pack_size: string | null;
}

interface InventoryItemRow {
  id: string;
  name: string;
  stock_on_hand: number | string | null;
}

interface SeedInventoryItemRow extends InventoryItemRow {
  selling_price: number | string | null;
  unit_price: number | string | null;
  supplier?: string | null;
  pack_size?: string | null;
  is_active?: boolean | null;
}

interface StockDeductionItemRow {
  id: string;
  supplier_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number | null;
}

interface InventoryStockUpdate {
  id: string;
  name: string;
  inventoryName: string;
  stockOnHand: number;
  quantity: number;
}

interface AppliedInventoryUpdate extends InventoryStockUpdate {
  nextStockOnHand: number;
}

interface OrderProductLine extends ProductLine {
  productId?: string;
  quantity: number;
}

export interface Order {
  id: string;
  store: string;
  status: OrderStatus;
  stockDeducted: boolean;
  amount: number;
  paymentMethod: string;
  itemsCount: number;
  time: string;
  products: OrderProductLine[];
}

interface MobileOrdersContextValue {
  orders: Order[];
  loading: boolean;
  error: string | null;
  getOrderById: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: OrderStatus, fallbackOrder?: Order) => void;
  advanceOrderStatus: (
    orderId: string,
    fallbackOrder?: Order
  ) => Promise<AdvanceOrderResult>;
  seedTestOrders: () => Promise<AdvanceOrderResult>;
  clearTestOrders: () => Promise<AdvanceOrderResult>;
  resetOrders: () => void;
}

interface AdvanceOrderResult {
  success: boolean;
  error?: string;
}

const MOBILE_STATUS_NOTE_PREFIX = "mobile_status=";
const STOCK_DEDUCTED_NOTE = "stock_deducted=true";

export const initialOrders: Order[] = [
  {
    id: "3291",
    store: "Mama Kada Store",
    status: "Pending",
    stockDeducted: false,
    amount: 86.5,
    paymentMethod: "Cash on Delivery",
    itemsCount: 2,
    time: "Today, 09:42",
    products: [
      { name: "Coca-Cola Case", detail: "Case", quantity: 1, image: "/product-icons/fanta-orange-50cl.webp" },
      { name: "Rice 5kg", detail: "Bag", quantity: 1, tone: "orange" },
    ],
  },
  {
    id: "3287",
    store: "Kwetu Butik",
    status: "Confirmed",
    stockDeducted: false,
    amount: 124,
    paymentMethod: "Paid Online",
    itemsCount: 3,
    time: "Today, 08:10",
    products: [
      { name: "Sardines Cans", detail: "Cans", quantity: 1, tone: "red" },
      { name: "Cooking Oil", detail: "Oil", quantity: 1, tone: "orange" },
    ],
  },
  {
    id: "3279",
    store: "Kimia Mart",
    status: "In Transit",
    stockDeducted: true,
    amount: 65.5,
    paymentMethod: "Paid Online",
    itemsCount: 2,
    time: "Yesterday, 18:25",
    products: [
      { name: "Washing Powder", detail: "Pack", quantity: 1, tone: "blue" },
      { name: "Sugar 2kg", detail: "Bag", quantity: 1, tone: "blue" },
    ],
  },
  {
    id: "3272",
    store: "Patrice Mini Market",
    status: "Delivered",
    stockDeducted: true,
    amount: 42.75,
    paymentMethod: "Cash on Delivery",
    itemsCount: 4,
    time: "Yesterday, 14:03",
    products: [
      { name: "Soft Drinks", detail: "Bottles", quantity: 1, image: "/product-icons/fanta-orange-50cl.webp" },
      { name: "Biscuit Pack", detail: "Pack", quantity: 1, tone: "orange" },
    ],
  },
];

const MobileOrdersContext = createContext<MobileOrdersContextValue | null>(null);

function normalizeOrderId(orderId: string): string {
  return orderId.replace(/^#/, "");
}

function formatOrderTime(createdAt: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(createdAt));
  } catch {
    return createdAt;
  }
}

function formatOrderId(id: string): string {
  return id.replace(/^#/, "");
}

function mapSupplierStatusToMobileStatus(
  status: SupabaseOrderStatus,
  notes?: string | null
): OrderStatus {
  const mobileStatus = getMobileStatusFromNotes(notes);

  if (mobileStatus) return mobileStatus;

  if (status === "Draft") return "Pending";
  return status;
}

function mapMobileStatusToSupplierStatus(status: OrderStatus): SupabaseOrderStatus {
  if (status === "Preparing" || status === "Ready for Pickup") return "Packed";
  return status;
}

function getMobileStatusNote(status: OrderStatus): string | null {
  if (status === "Pending") return "mobile_status=Pending";
  if (status === "Confirmed") return "mobile_status=Confirmed";
  if (status === "Preparing") return "mobile_status=Preparing";
  if (status === "Ready for Pickup") return "mobile_status=Ready for Pickup";
  if (status === "In Transit") return "mobile_status=In Transit";
  if (status === "Delivered") return "mobile_status=Delivered";
  return null;
}

function hasStockDeducted(notes?: string | null): boolean {
  return splitNotes(notes).includes(STOCK_DEDUCTED_NOTE);
}

function splitNotes(notes?: string | null): string[] {
  return (notes ?? "")
    .split(";")
    .map((note) => note.trim())
    .filter(Boolean);
}

function getMobileStatusFromNotes(notes?: string | null): OrderStatus | null {
  const mobileStatusNote = splitNotes(notes).find((note) =>
    note.startsWith(MOBILE_STATUS_NOTE_PREFIX)
  );
  const mobileStatus = mobileStatusNote?.replace(MOBILE_STATUS_NOTE_PREFIX, "");

  if (
    mobileStatus === "Pending" ||
    mobileStatus === "Confirmed" ||
    mobileStatus === "Preparing" ||
    mobileStatus === "Ready for Pickup" ||
    mobileStatus === "In Transit" ||
    mobileStatus === "Delivered"
  ) {
    return mobileStatus;
  }

  return null;
}

function setMobileStatusInNotes(notes: string | null, status: OrderStatus): string | null {
  const mobileStatusNote = getMobileStatusNote(status);
  const nextNotes = splitNotes(notes).filter(
    (note) => !note.startsWith(MOBILE_STATUS_NOTE_PREFIX)
  );

  if (mobileStatusNote) nextNotes.push(mobileStatusNote);

  return nextNotes.length > 0 ? nextNotes.join(";") : null;
}

function addStockDeductedFlag(notes: string | null): string {
  const nextNotes = splitNotes(notes).filter((note) => note !== STOCK_DEDUCTED_NOTE);
  nextNotes.push(STOCK_DEDUCTED_NOTE);
  return nextNotes.join(";");
}

function buildOrderNotes(
  existingNotes: string | null,
  status: OrderStatus,
  stockDeducted: boolean
): string | null {
  const notesWithStatus = setMobileStatusInNotes(existingNotes, status);

  if (stockDeducted || hasStockDeducted(existingNotes)) {
    return addStockDeductedFlag(notesWithStatus);
  }

  return notesWithStatus;
}

function normalizeName(value: string): string {
  const tokens = value
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  return tokens
    .filter((token, index) => {
      const previousToken = tokens[index - 1];
      const nextToken = tokens[index + 1];
      const tokenIsPackaging = PACKAGING_NAME_TOKENS.has(token);
      const tokenIsPackagingQuantity =
        /^\d+$/.test(token) &&
        ((previousToken && PACKAGING_NAME_TOKENS.has(previousToken)) ||
          (nextToken && PACKAGING_NAME_TOKENS.has(nextToken)));

      return !tokenIsPackaging && !tokenIsPackagingQuantity;
    })
    .join(" ");
}

function mapSupplierRowsToOrders(
  orderRows: SupplierOrderRow[],
  itemRows: SupplierOrderItemRow[]
): Order[] {
  const itemsByOrderId = itemRows.reduce<Record<string, SupplierOrderItemRow[]>>(
    (collection, item) => {
      collection[item.supplier_order_id] = collection[item.supplier_order_id] ?? [];
      collection[item.supplier_order_id].push(item);
      return collection;
    },
    {}
  );

  return orderRows.map((row) => {
    const items = itemsByOrderId[row.id] ?? [];
    const quantityTotal = items.reduce((total, item) => {
      const quantity = Number(item.quantity);
      return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total;
    }, 0);

    return {
      id: formatOrderId(row.id),
      store: row.supplier_name,
      status: mapSupplierStatusToMobileStatus(row.status, row.notes),
      stockDeducted: hasStockDeducted(row.notes),
      amount: row.total_amount,
      paymentMethod: "Boutique order",
      itemsCount: quantityTotal > 0 ? quantityTotal : items.length,
      time: formatOrderTime(row.created_at),
      products: items.map((item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_price);
        const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;

        return {
          productId: item.product_id ?? undefined,
          name: item.name,
          detail: item.pack_size ?? "item",
          quantity: safeQuantity,
          amount: `${new Intl.NumberFormat("fr-CD").format(
            safeQuantity * safeUnitPrice
          )} CDF`,
        };
      }),
    };
  });
}

async function getCurrentMerchantId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Could not verify merchant session.");
  }

  return user.id;
}

async function getSupplierOrderNotes(
  supabase: ReturnType<typeof createClient>,
  merchantId: string,
  orderId: string
): Promise<string | null> {
  const { data: orderRow, error: orderError } = await supabase
    .from("supplier_orders")
    .select("id, notes")
    .eq("id", orderId)
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!orderRow) throw new Error("Order not found.");

  return (orderRow as { notes: string | null }).notes;
}

interface NormalizedInventoryItem extends InventoryItemRow {
  normalizedName: string;
  compactName: string;
  stockOnHandNumber: number;
}

interface InventoryCandidate extends NormalizedInventoryItem {
  matchType: "product_id" | "name";
  score: number;
}

const PACKAGING_NAME_TOKENS = new Set([
  "bag",
  "bags",
  "bottle",
  "bottles",
  "box",
  "boxes",
  "carton",
  "cartons",
  "case",
  "cases",
  "crate",
  "crates",
  "item",
  "items",
  "pack",
  "packs",
  "unit",
  "units",
]);

function compactName(value: string): string {
  return normalizeName(value).replace(/\s+/g, "");
}

function getSignificantNameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token.length > 1 && !PACKAGING_NAME_TOKENS.has(token));
}

function getAvailableStock(item: InventoryItemRow): number {
  const stock = Number(item.stock_on_hand ?? 0);
  return Number.isFinite(stock) ? stock : 0;
}

function getNameMatchScore(itemName: string, inventoryName: string): number {
  const normalizedItemName = normalizeName(itemName);
  const normalizedInventoryName = normalizeName(inventoryName);

  if (!normalizedItemName || !normalizedInventoryName) return 0;
  if (normalizedItemName === normalizedInventoryName) return 100;

  const compactItemName = compactName(itemName);
  const compactInventoryName = compactName(inventoryName);

  if (compactItemName === compactInventoryName) return 95;
  if (
    normalizedInventoryName.includes(normalizedItemName) ||
    normalizedItemName.includes(normalizedInventoryName)
  ) {
    return 90;
  }
  if (
    compactInventoryName.includes(compactItemName) ||
    compactItemName.includes(compactInventoryName)
  ) {
    return 85;
  }

  const itemTokens = getSignificantNameTokens(itemName);
  const inventoryTokens = getSignificantNameTokens(inventoryName);
  const overlappingTokens = itemTokens.filter((itemToken) =>
    inventoryTokens.some(
      (inventoryToken) =>
        inventoryToken === itemToken ||
        inventoryToken.includes(itemToken) ||
        itemToken.includes(inventoryToken)
    )
  );

  if (overlappingTokens.length === 0) return 0;

  const requiredOverlap = itemTokens.length <= 1 ? 1 : Math.min(2, itemTokens.length);
  if (overlappingTokens.length < requiredOverlap) return 0;

  return 50 + overlappingTokens.length * 10;
}

function normalizeInventoryRows(inventoryRows: InventoryItemRow[]): NormalizedInventoryItem[] {
  return inventoryRows.map((item) => ({
    ...item,
    normalizedName: normalizeName(item.name),
    compactName: compactName(item.name),
    stockOnHandNumber: getAvailableStock(item),
  }));
}

function getInventoryCandidatesForOrderItem(
  item: StockDeductionItemRow,
  inventory: NormalizedInventoryItem[]
): InventoryCandidate[] {
  const candidatesById = new Map<string, InventoryCandidate>();
  const productId = item.product_id?.trim();

  if (productId) {
    const productIdMatch = inventory.find((product) => product.id === productId);

    if (productIdMatch) {
      candidatesById.set(productIdMatch.id, {
        ...productIdMatch,
        matchType: "product_id",
        score: 1000,
      });
    }
  }

  for (const inventoryItem of inventory) {
    const score = getNameMatchScore(item.name, inventoryItem.name);
    if (score === 0) continue;

    const existingCandidate = candidatesById.get(inventoryItem.id);
    if (existingCandidate?.matchType === "product_id") continue;

    candidatesById.set(inventoryItem.id, {
      ...inventoryItem,
      matchType: "name",
      score,
    });
  }

  return Array.from(candidatesById.values()).sort((first, second) => {
    if (first.matchType !== second.matchType) {
      return first.matchType === "product_id" ? -1 : 1;
    }

    if (first.score !== second.score) return second.score - first.score;
    return second.stockOnHandNumber - first.stockOnHandNumber;
  });
}

function formatStockAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function getInsufficientStockMessage({
  itemName,
  inventoryName,
  required,
  available,
}: {
  itemName: string;
  inventoryName?: string;
  required: number;
  available: number;
}): string {
  const matchedInventory =
    inventoryName && normalizeName(inventoryName) !== normalizeName(itemName)
      ? ` Matched inventory: ${inventoryName}.`
      : "";

  return `Not enough stock for ${itemName}.${matchedInventory} Required: ${formatStockAmount(
    required
  )}, Available: ${formatStockAmount(available)}`;
}

function getAvailableInventoryPreview(inventory: NormalizedInventoryItem[]): string {
  const inventoryNames = inventory
    .slice(0, 5)
    .map((inventoryItem) => inventoryItem.name)
    .filter(Boolean);

  return inventoryNames.length > 0 ? inventoryNames.join(", ") : "none";
}

function getInventoryNotFoundMessage(
  itemName: string,
  inventory: NormalizedInventoryItem[]
): string {
  return `Inventory item not found for ${itemName}. Available inventory: ${getAvailableInventoryPreview(
    inventory
  )}`;
}

function selectInventoryItemForOrderItem(
  item: StockDeductionItemRow,
  inventory: NormalizedInventoryItem[],
  required: number
): InventoryCandidate {
  console.log("Matching item", {
    itemName: item.name,
    productId: item.product_id,
    quantity: item.quantity,
  });

  const candidates = getInventoryCandidatesForOrderItem(item, inventory);
  const productIdCandidate = candidates.find(
    (candidate) => candidate.matchType === "product_id"
  );
  const nameCandidates = candidates
    .filter((candidate) => candidate.matchType === "name")
    .sort((first, second) => second.stockOnHandNumber - first.stockOnHandNumber);
  const selectedInventoryItem =
    productIdCandidate && productIdCandidate.stockOnHandNumber >= required
      ? productIdCandidate
      : nameCandidates.find((candidate) => candidate.stockOnHandNumber >= required);
  const bestFallbackCandidate =
    selectedInventoryItem ??
    [productIdCandidate, ...nameCandidates]
      .filter((candidate): candidate is InventoryCandidate => Boolean(candidate))
      .sort((first, second) => second.stockOnHandNumber - first.stockOnHandNumber)[0] ??
    candidates[0];

  console.log("Inventory candidates", candidates);
  console.log("Selected inventory item", selectedInventoryItem);
  console.log("Stock check", {
    itemName: item.name,
    inventoryName: bestFallbackCandidate?.name,
    required,
    available: bestFallbackCandidate?.stock_on_hand,
  });

  if (selectedInventoryItem) {
    return selectedInventoryItem;
  }

  if (!bestFallbackCandidate) {
    console.log("No inventory match found", {
      itemName: item.name,
      availableInventory: inventory.slice(0, 5).map((inventoryItem) => inventoryItem.name),
    });
    throw new Error(getInventoryNotFoundMessage(item.name, inventory));
  }

  throw new Error(
    getInsufficientStockMessage({
      itemName: item.name,
      inventoryName: bestFallbackCandidate.name,
      required,
      available: bestFallbackCandidate.stockOnHandNumber,
    })
  );
}

function buildInventoryStockUpdates(
  orderItems: StockDeductionItemRow[],
  inventory: NormalizedInventoryItem[]
): InventoryStockUpdate[] {
  const updatesByInventoryId = new Map<string, InventoryStockUpdate>();

  for (const item of orderItems) {
    const itemQuantity = Number(item.quantity);
    const quantity = Number.isFinite(itemQuantity) && itemQuantity > 0 ? itemQuantity : 1;
    const inventoryItem = selectInventoryItemForOrderItem(item, inventory, quantity);
    const availableStock = inventoryItem.stockOnHandNumber;

    const currentUpdate = updatesByInventoryId.get(inventoryItem.id);

    if (currentUpdate) {
      currentUpdate.quantity += quantity;
      continue;
    }

    updatesByInventoryId.set(inventoryItem.id, {
      id: inventoryItem.id,
      name: item.name,
      inventoryName: inventoryItem.name,
      stockOnHand: availableStock,
      quantity,
    });
  }

  const stockUpdates = Array.from(updatesByInventoryId.values());
  const insufficientStock = stockUpdates.find(
    (update) => update.stockOnHand < update.quantity
  );

  if (insufficientStock) {
    throw new Error(
      getInsufficientStockMessage({
        itemName: insufficientStock.name,
        inventoryName: insufficientStock.inventoryName,
        required: insufficientStock.quantity,
        available: insufficientStock.stockOnHand,
      })
    );
  }

  return stockUpdates;
}

async function rollbackInventoryUpdates(
  supabase: ReturnType<typeof createClient>,
  merchantId: string,
  appliedUpdates: AppliedInventoryUpdate[]
) {
  await Promise.all(
    appliedUpdates.map((update) =>
      supabase
        .from("inventory_items")
        .update({
          stock_on_hand: update.stockOnHand,
          updated_at: new Date().toISOString(),
        })
        .eq("id", update.id)
        .eq("merchant_id", merchantId)
        .eq("stock_on_hand", update.nextStockOnHand)
    )
  );
}

async function updateInventoryStock({
  supabase,
  merchantId,
  update,
}: {
  supabase: ReturnType<typeof createClient>;
  merchantId: string;
  update: InventoryStockUpdate;
}): Promise<AppliedInventoryUpdate> {
  const newStock = update.stockOnHand - update.quantity;

  console.log("Deducting stock", {
    product: update.name,
    inventoryProduct: update.inventoryName,
    newStock,
  });

  const { data, error } = await supabase
    .from("inventory_items")
    .update({
      stock_on_hand: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", update.id)
    .eq("merchant_id", merchantId)
    .eq("stock_on_hand", update.stockOnHand)
    .select("id");

  if (error) {
    throw new Error(`Could not update stock for ${update.name}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`Could not update stock for ${update.name}`);
  }

  return { ...update, nextStockOnHand: newStock };
}

async function applyInventoryUpdates(
  supabase: ReturnType<typeof createClient>,
  merchantId: string,
  stockUpdates: InventoryStockUpdate[]
): Promise<AppliedInventoryUpdate[]> {
  const appliedUpdates: AppliedInventoryUpdate[] = [];

  try {
    for (const update of stockUpdates) {
      appliedUpdates.push(await updateInventoryStock({ supabase, merchantId, update }));
    }
  } catch (error) {
    await rollbackInventoryUpdates(supabase, merchantId, appliedUpdates);
    throw error;
  }

  return appliedUpdates;
}

async function updateSupplierOrderStatusInSupabase({
  supabase,
  merchantId,
  orderId,
  status,
  stockDeducted,
  existingNotes,
}: {
  supabase: ReturnType<typeof createClient>;
  merchantId: string;
  orderId: string;
  status: OrderStatus;
  stockDeducted: boolean;
  existingNotes: string | null;
}) {
  console.log("Updating order notes/status");

  const { data, error } = await supabase
    .from("supplier_orders")
    .update({
      status: mapMobileStatusToSupplierStatus(status),
      notes: buildOrderNotes(existingNotes, status, stockDeducted),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("merchant_id", merchantId)
    .select("id");

  if (error) throw new Error(`Could not update order status: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Order not found.");
}

async function prepareOrderInSupabase(
  supabase: ReturnType<typeof createClient>,
  orderId: string
): Promise<{ stockDeducted: boolean }> {
  console.time("prepare order stock deduction");
  const normalizedOrderId = normalizeOrderId(orderId);
  console.log("Preparing order", normalizedOrderId);

  try {
    const merchantId = await getCurrentMerchantId(supabase);
    const [existingNotes, itemsResult] = await Promise.all([
      getSupplierOrderNotes(supabase, merchantId, normalizedOrderId),
      supabase
        .from("supplier_order_items")
        .select("id, supplier_order_id, product_id, name, quantity")
        .eq("supplier_order_id", normalizedOrderId)
        .eq("merchant_id", merchantId),
    ]);
    let appliedUpdates: AppliedInventoryUpdate[] = [];

    if (!hasStockDeducted(existingNotes)) {
      if (itemsResult.error) {
        throw new Error(`Could not load order items: ${itemsResult.error.message}`);
      }

      const orderItems = (itemsResult.data as StockDeductionItemRow[] | null) ?? [];
      console.log("Order items", orderItems);

      if (orderItems.length === 0) {
        throw new Error("No order items found for this order");
      }

      const { data: inventoryRows, error: inventoryError } = await supabase
        .from("inventory_items")
        .select("id, name, stock_on_hand")
        .eq("merchant_id", merchantId);

      if (inventoryError) {
        throw new Error(`Could not load inventory: ${inventoryError.message}`);
      }

      const inventory = normalizeInventoryRows(
        (inventoryRows as InventoryItemRow[] | null) ?? []
      );

      const stockUpdates = buildInventoryStockUpdates(orderItems, inventory);
      appliedUpdates = await applyInventoryUpdates(supabase, merchantId, stockUpdates);
    }

    try {
      await updateSupplierOrderStatusInSupabase({
        supabase,
        merchantId,
        orderId: normalizedOrderId,
        status: "Preparing",
        stockDeducted: true,
        existingNotes,
      });
    } catch (error) {
      await rollbackInventoryUpdates(supabase, merchantId, appliedUpdates);
      throw error;
    }

    return { stockDeducted: true };
  } finally {
    console.timeEnd("prepare order stock deduction");
  }
}

async function persistSupplierOrderStatusInSupabase(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  status: OrderStatus,
  stockDeducted: boolean
): Promise<{ stockDeducted: boolean }> {
  const normalizedOrderId = normalizeOrderId(orderId);
  const merchantId = await getCurrentMerchantId(supabase);
  const existingNotes = await getSupplierOrderNotes(supabase, merchantId, normalizedOrderId);

  await updateSupplierOrderStatusInSupabase({
    supabase,
    merchantId,
    orderId: normalizedOrderId,
    status,
    stockDeducted,
    existingNotes,
  });

  return { stockDeducted: stockDeducted || hasStockDeducted(existingNotes) };
}

function getNextStatus(status: OrderStatus): OrderStatus {
  if (status === "Pending") return "Confirmed";
  if (status === "Confirmed") return "Preparing";
  if (status === "Preparing" || status === "Packed") return "Ready for Pickup";
  if (status === "Ready for Pickup") return "In Transit";
  if (status === "In Transit") return "Delivered";
  return status;
}

function upsertOrderStatus(
  orders: Order[],
  orderId: string,
  status: OrderStatus,
  fallbackOrder?: Order
): Order[] {
  const normalizedOrderId = normalizeOrderId(orderId);
  let foundOrder = false;

  const updatedOrders = orders.map((order) => {
    if (normalizeOrderId(order.id) !== normalizedOrderId) return order;
    foundOrder = true;
    return {
      ...order,
      id: normalizedOrderId,
      status,
      stockDeducted: order.stockDeducted || status === "Preparing",
    };
  });

  if (foundOrder) return updatedOrders;
  if (!fallbackOrder) return updatedOrders;

  return [
    {
      ...fallbackOrder,
      id: normalizedOrderId,
      status,
      stockDeducted: fallbackOrder.stockDeducted || status === "Preparing",
    },
    ...updatedOrders,
  ];
}

const TEST_ORDER_PRODUCT_NAMES = [
  "Coca-Cola Case",
  "Coca-Cola 50cl",
  "Fanta Orange 50cl",
  "Heineken 33cl",
  "Nkoyi Black 33cl",
  "Vitalo Water 30 x 500ml",
];

interface TestOrderSpec {
  key: string;
  store: string;
  status: SupabaseOrderStatus;
  notes: string;
  quantity: number;
}

const TEST_ORDER_SPECS: TestOrderSpec[] = [
  {
    key: "pending",
    store: "Mama Kada Store",
    status: "Pending",
    notes: "mobile_status=Pending",
    quantity: 2,
  },
  {
    key: "confirmed",
    store: "Kwetu Butik",
    status: "Confirmed",
    notes: "mobile_status=Confirmed",
    quantity: 2,
  },
  {
    key: "preparing",
    store: "Kimia Mart",
    status: "Confirmed",
    notes: "mobile_status=Preparing;stock_deducted=true",
    quantity: 1,
  },
  {
    key: "ready",
    store: "Patrice Mini Market",
    status: "Confirmed",
    notes: "mobile_status=Ready for Pickup;stock_deducted=true",
    quantity: 1,
  },
  {
    key: "transit",
    store: "Bandal Beverage Hub",
    status: "In Transit",
    notes: "mobile_status=In Transit;stock_deducted=true",
    quantity: 1,
  },
  {
    key: "delivered",
    store: "Sk",
    status: "Delivered",
    notes: "mobile_status=Delivered;stock_deducted=true",
    quantity: 1,
  },
];

function getInventoryUnitPrice(product: SeedInventoryItemRow): number {
  const sellingPrice = Number(product.selling_price ?? 0);
  if (Number.isFinite(sellingPrice) && sellingPrice > 0) return sellingPrice;

  const unitPrice = Number(product.unit_price ?? 0);
  return Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
}

function getInventoryPreferredMatchScore(
  preferredName: string,
  product: SeedInventoryItemRow
): number {
  const normalizedPreferredName = normalizeName(preferredName);
  const normalizedProductName = normalizeName(product.name);
  const compactPreferredName = compactName(preferredName);
  const compactProductName = compactName(product.name);

  if (!normalizedPreferredName || !normalizedProductName) return 0;
  if (normalizedPreferredName === normalizedProductName) return 100;
  if (compactPreferredName === compactProductName) return 95;
  if (
    normalizedProductName.includes(normalizedPreferredName) ||
    normalizedPreferredName.includes(normalizedProductName)
  ) {
    return 90;
  }
  if (
    compactProductName.includes(compactPreferredName) ||
    compactPreferredName.includes(compactProductName)
  ) {
    return 85;
  }

  return getNameMatchScore(preferredName, product.name);
}

function getSeedInventoryProducts(
  inventoryRows: SeedInventoryItemRow[]
): SeedInventoryItemRow[] {
  const availableProducts = inventoryRows
    .filter((product) => product.is_active !== false && getAvailableStock(product) > 0)
    .sort((first, second) => first.name.localeCompare(second.name));
  const selectedProducts: SeedInventoryItemRow[] = [];
  const usedProductIds = new Set<string>();

  for (const preferredName of TEST_ORDER_PRODUCT_NAMES) {
    const preferredProduct = availableProducts
      .filter((product) => !usedProductIds.has(product.id))
      .map((product) => ({
        product,
        score: getInventoryPreferredMatchScore(preferredName, product),
      }))
      .filter(({ score }) => score > 0)
      .sort((first, second) => {
        if (first.score !== second.score) return second.score - first.score;
        return getAvailableStock(second.product) - getAvailableStock(first.product);
      })[0]?.product;

    if (!preferredProduct) continue;

    selectedProducts.push(preferredProduct);
    usedProductIds.add(preferredProduct.id);
  }

  for (const product of availableProducts) {
    if (selectedProducts.length >= TEST_ORDER_SPECS.length) break;
    if (usedProductIds.has(product.id)) continue;
    selectedProducts.push(product);
    usedProductIds.add(product.id);
  }

  return selectedProducts;
}

function getSeedProductForSpec(
  products: SeedInventoryItemRow[],
  index: number,
  preferredQuantity: number
): SeedInventoryItemRow {
  const rotatedProducts = [...products.slice(index), ...products.slice(0, index)];
  return (
    rotatedProducts.find((product) => getAvailableStock(product) >= preferredQuantity) ??
    products[index % products.length]
  );
}

async function seedMobileTestOrdersInSupabase(
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const merchantId = await getCurrentMerchantId(supabase);
  const { data: inventoryRows, error: inventoryError } = await supabase
    .from("inventory_items")
    .select(
      "id, name, stock_on_hand, selling_price, unit_price, supplier, pack_size, is_active"
    )
    .eq("merchant_id", merchantId)
    .order("name", { ascending: true });

  if (inventoryError) {
    throw new Error(`Could not load inventory for test orders: ${inventoryError.message}`);
  }

  const seedProducts = getSeedInventoryProducts(
    (inventoryRows as SeedInventoryItemRow[] | null) ?? []
  );

  if (seedProducts.length === 0) {
    throw new Error("No inventory items with available stock found for test orders.");
  }

  const timestamp = Date.now();
  const createdBase = new Date();
  const orderRows = TEST_ORDER_SPECS.map((spec, index) => {
    const product = getSeedProductForSpec(seedProducts, index, spec.quantity);
    const availableStock = Math.max(1, Math.floor(getAvailableStock(product)));
    const quantity = Math.min(spec.quantity, availableStock);
    const unitPrice = Math.round(getInventoryUnitPrice(product));

    return {
      id: `mobile-test-${spec.key}-${timestamp}`,
      merchant_id: merchantId,
      reference: `mobile-test-${spec.key}-${timestamp}`,
      supplier_name: spec.store,
      status: spec.status,
      source: "Orders",
      source_detail: "manual-new-order",
      delivery_address: "Development test order",
      notes: spec.notes,
      total_amount: Math.round(quantity * unitPrice),
      created_at: new Date(createdBase.getTime() - index * 60_000).toISOString(),
      eta_at: null,
      updated_at: new Date().toISOString(),
    };
  });
  const orderItemRows = TEST_ORDER_SPECS.map((spec, index) => {
    const product = getSeedProductForSpec(seedProducts, index, spec.quantity);
    const availableStock = Math.max(1, Math.floor(getAvailableStock(product)));
    const quantity = Math.min(spec.quantity, availableStock);
    const unitPrice = Math.round(getInventoryUnitPrice(product));
    const orderId = `mobile-test-${spec.key}-${timestamp}`;

    return {
      id: `${orderId}:item:1`,
      merchant_id: merchantId,
      supplier_order_id: orderId,
      product_id: product.id,
      name: product.name,
      supplier: product.supplier ?? "Zando",
      quantity,
      unit_price: unitPrice,
      pack_size: product.pack_size ?? "unit",
      created_at: new Date(createdBase.getTime() - index * 60_000).toISOString(),
    };
  });

  const { error: orderInsertError } = await supabase
    .from("supplier_orders")
    .insert(orderRows);

  if (orderInsertError) {
    throw new Error(`Could not seed test orders: ${orderInsertError.message}`);
  }

  const { error: itemInsertError } = await supabase
    .from("supplier_order_items")
    .insert(orderItemRows);

  if (itemInsertError) {
    await supabase
      .from("supplier_orders")
      .delete()
      .eq("merchant_id", merchantId)
      .in(
        "id",
        orderRows.map((order) => order.id)
      );
    throw new Error(`Could not seed test order items: ${itemInsertError.message}`);
  }
}

async function clearMobileTestOrdersInSupabase(
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const merchantId = await getCurrentMerchantId(supabase);
  const { error: itemDeleteError } = await supabase
    .from("supplier_order_items")
    .delete()
    .eq("merchant_id", merchantId)
    .like("supplier_order_id", "mobile-test-%");

  if (itemDeleteError) {
    throw new Error(`Could not clear test order items: ${itemDeleteError.message}`);
  }

  const { error: orderDeleteError } = await supabase
    .from("supplier_orders")
    .delete()
    .eq("merchant_id", merchantId)
    .like("id", "mobile-test-%");

  if (orderDeleteError) {
    throw new Error(`Could not clear test orders: ${orderDeleteError.message}`);
  }
}

export function MobileOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseOrderIds, setSupabaseOrderIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  const loadOrders = useCallback(
    async (isCancelled?: () => boolean) => {
      console.time("load mobile orders");

      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (isCancelled?.()) return;

        if (userError || !user) {
          setOrders(initialOrders);
          setSupabaseOrderIds(new Set());
          setLoading(false);
          return;
        }

        const { data, error: ordersError } = await supabase
          .from("supplier_orders")
          .select("id, supplier_name, status, total_amount, created_at, notes")
          .eq("merchant_id", user.id)
          .order("created_at", { ascending: false });

        if (isCancelled?.()) return;

        if (ordersError) {
          setError(`Unable to load supplier orders: ${ordersError.message}`);
          setOrders([]);
          setSupabaseOrderIds(new Set());
          setLoading(false);
          return;
        }

        const orderRows = (data as SupplierOrderRow[] | null) ?? [];
        const orderIds = orderRows.map((order) => order.id);
        let itemRows: SupplierOrderItemRow[] = [];

        if (orderIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from("supplier_order_items")
            .select("supplier_order_id, product_id, name, quantity, unit_price, pack_size")
            .eq("merchant_id", user.id)
            .in("supplier_order_id", orderIds)
            .order("created_at", { ascending: true });

          if (isCancelled?.()) return;

          if (itemsError) {
            setError(`Unable to load supplier order items: ${itemsError.message}`);
          } else {
            itemRows = (itemsData as SupplierOrderItemRow[] | null) ?? [];
          }
        }

        const loadedOrders = mapSupplierRowsToOrders(orderRows, itemRows);

        setOrders(loadedOrders);
        setSupabaseOrderIds(new Set(loadedOrders.map((order) => order.id)));
        setLoading(false);
      } finally {
        console.timeEnd("load mobile orders");
      }
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    void loadOrders(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [loadOrders]);

  const getOrderById = useCallback(
    (orderId: string) => {
      const normalizedOrderId = normalizeOrderId(orderId);
      return orders.find((order) => order.id === normalizedOrderId);
    },
    [orders]
  );

  const persistOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, stockDeducted = false) => {
      const normalizedOrderId = normalizeOrderId(orderId);
      if (!supabaseOrderIds.has(normalizedOrderId)) return { stockDeducted };

      return persistSupplierOrderStatusInSupabase(
        supabase,
        normalizedOrderId,
        status,
        stockDeducted
      );
    },
    [supabase, supabaseOrderIds]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus, fallbackOrder?: Order) => {
      const normalizedOrderId = normalizeOrderId(orderId);
      const currentOrder =
        orders.find((order) => normalizeOrderId(order.id) === normalizedOrderId) ??
        fallbackOrder;
      const stockDeducted = currentOrder?.stockDeducted || status === "Preparing";
      setError(null);

      setOrders((currentOrders) => {
        const updatedOrders = upsertOrderStatus(
          currentOrders,
          normalizedOrderId,
          status,
          currentOrder
        ).map((order) =>
          normalizeOrderId(order.id) === normalizedOrderId
            ? { ...order, stockDeducted }
            : order
        );
        return updatedOrders;
      });

      void persistOrderStatus(normalizedOrderId, status, stockDeducted).catch((statusError) => {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "Unable to update supplier order."
        );
      });
    },
    [orders, persistOrderStatus]
  );

  const advanceOrderStatus = useCallback(
    async (orderId: string, fallbackOrder?: Order) => {
      const normalizedOrderId = normalizeOrderId(orderId);
      setError(null);

      const currentOrder =
        orders.find((order) => normalizeOrderId(order.id) === normalizedOrderId) ??
        fallbackOrder;

      if (!currentOrder) {
        const message = "Order not found.";
        setError(message);
        return { success: false, error: message };
      }

      const nextStatus = getNextStatus(currentOrder.status);
      let stockDeducted = currentOrder.stockDeducted;
      const isSupabaseOrder = supabaseOrderIds.has(normalizedOrderId);
      const isPreparingOrder =
        currentOrder.status === "Confirmed" && nextStatus === "Preparing";

      if (isSupabaseOrder) {
        try {
          const result =
            isPreparingOrder
              ? await prepareOrderInSupabase(supabase, normalizedOrderId)
              : await persistOrderStatus(normalizedOrderId, nextStatus, stockDeducted);

          stockDeducted = result.stockDeducted;
        } catch (statusError) {
          const message =
            statusError instanceof Error
              ? statusError.message
              : "Unable to update supplier order.";
          setError(message);
          return { success: false, error: message };
        }
      }

      setOrders((currentOrders) => {
        const updatedOrders = upsertOrderStatus(
          currentOrders,
          normalizedOrderId,
          nextStatus,
          { ...currentOrder, stockDeducted }
        ).map((order) =>
          normalizeOrderId(order.id) === normalizedOrderId
            ? { ...order, stockDeducted }
            : order
        );
        return updatedOrders;
      });

      return { success: true };
    },
    [orders, persistOrderStatus, supabase, supabaseOrderIds]
  );

  const seedTestOrders = useCallback(async (): Promise<AdvanceOrderResult> => {
    setError(null);

    try {
      await seedMobileTestOrdersInSupabase(supabase);
      await loadOrders();
      return { success: true };
    } catch (seedError) {
      const message =
        seedError instanceof Error ? seedError.message : "Unable to seed test orders.";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadOrders, supabase]);

  const clearTestOrders = useCallback(async (): Promise<AdvanceOrderResult> => {
    setError(null);

    try {
      await clearMobileTestOrdersInSupabase(supabase);
      await loadOrders();
      return { success: true };
    } catch (clearError) {
      const message =
        clearError instanceof Error ? clearError.message : "Unable to clear test orders.";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadOrders, supabase]);

  const resetOrders = useCallback(() => {
    setOrders(initialOrders);
  }, []);

  const value = useMemo(
    () => ({
      orders,
      loading,
      error,
      getOrderById,
      updateOrderStatus,
      advanceOrderStatus,
      seedTestOrders,
      clearTestOrders,
      resetOrders,
    }),
    [
      advanceOrderStatus,
      clearTestOrders,
      error,
      getOrderById,
      loading,
      orders,
      resetOrders,
      seedTestOrders,
      updateOrderStatus,
    ]
  );

  return <MobileOrdersContext.Provider value={value}>{children}</MobileOrdersContext.Provider>;
}

export function useMobileOrders() {
  const context = useContext(MobileOrdersContext);
  if (!context) {
    throw new Error("useMobileOrders must be used within MobileOrdersProvider");
  }
  return context;
}
