"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/components/cart/CartContext";
import { createClient } from "@/lib/supabase/client";
import {
  toActivityFeedRow,
  toDeliveryUpdateRow,
  toInventoryItemRow,
  toSaleRow,
  toSupplierOrderItemRows,
  toSupplierOrderRow,
} from "@/lib/merchant-store";
import {
  buildInventoryProducts,
  estimateCostFromSellingPrice,
  formatCdf,
  formatShortDate,
  getDeliveryTrackingStatus,
  getNextDeliveryTrackingStatus,
  getStockStatus,
  isActiveOrder,
  isTrackedDeliveryOrder,
  type DeliveryTrackingStatus,
  type InventoryProduct,
  type MerchantActivity,
  type MerchantOrder,
  type MerchantOrderItem,
  type MerchantOrderSourceDetail,
  type MerchantProduct,
  type MerchantSale,
  type MerchantSalePaymentMethod,
  type MerchantState,
  type MerchantStockStatus,
} from "@/lib/merchant-data";

type DraftLaunchReason =
  | "home-basket"
  | "home-low-stock"
  | "inventory-reorder"
  | "orders-reorder";

interface CreateOrdersInput {
  items: CartItem[];
  deliveryAddress: string;
  notes?: string;
  source?: MerchantOrder["source"];
  sourceDetail?: MerchantOrderSourceDetail;
  draftOrderId?: string | null;
}

interface LaunchDraftOrderInput {
  items: CartItem[];
  source: MerchantOrder["source"];
  reason: DraftLaunchReason;
  productName?: string;
}

interface SyncDraftOrderInput {
  draftOrderId: string;
  items: CartItem[];
}

interface QuickAddProductInput {
  name: string;
  category: string;
  sellingPrice: number;
  startingStock?: number | null;
}

interface RecordSaleInput {
  productId?: string | null;
  quantity: number;
  unitPrice: number;
  paymentMethod: MerchantSalePaymentMethod;
  soldAt: string;
  quickAddProduct?: QuickAddProductInput | null;
}

interface TopSellingProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
}

interface SalesLowStockInsight {
  saleId: string;
  productId: string;
  productName: string;
  quantitySold: number;
  stockAfterSale: number;
  soldAt: string;
  stockStatus: MerchantStockStatus;
}

interface MerchantDataContextValue {
  state: MerchantState;
  inventory: InventoryProduct[];
  orders: MerchantOrder[];
  activeOrders: MerchantOrder[];
  lowStockProducts: InventoryProduct[];
  sales: MerchantSale[];
  todaySales: MerchantSale[];
  topSellingProducts: TopSellingProduct[];
  salesLowStockInsights: SalesLowStockInsight[];
  recentActivity: MerchantActivity[];
  lastOrder: MerchantOrder | null;
  lastSuccessfulOrder: MerchantOrder | null;
  createOrders: (input: CreateOrdersInput) => Promise<MerchantOrder[]>;
  launchDraftOrder: (input: LaunchDraftOrderInput) => Promise<MerchantOrder | null>;
  syncDraftOrder: (input: SyncDraftOrderInput) => Promise<void>;
  updateDeliveryStatus: (
    orderId: string,
    status: DeliveryTrackingStatus
  ) => Promise<MerchantOrder | null>;
  recordSale: (input: RecordSaleInput) => Promise<MerchantSale>;
  voidLatestSale: () => Promise<MerchantSale | null>;
  buildDraftFromProduct: (productId: string) => CartItem[];
  buildDraftFromOrder: (orderId: string) => CartItem[];
  findProduct: (productId: string) => InventoryProduct | undefined;
}

interface MerchantDataProviderProps {
  children: ReactNode;
  merchantId: string;
  initialState: MerchantState;
}

const MerchantDataContext = createContext<MerchantDataContextValue | null>(null);

function addDays(dateString: string, days: number): string {
  const nextDate = new Date(dateString);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function isSameCalendarDay(leftDate: string, rightDate: Date): boolean {
  const left = new Date(leftDate);
  return (
    left.getFullYear() === rightDate.getFullYear() &&
    left.getMonth() === rightDate.getMonth() &&
    left.getDate() === rightDate.getDate()
  );
}

function getNextOrderSequence(existingOrders: MerchantOrder[]): number {
  return existingOrders.reduce((highestValue, order) => {
    const numericRef = Number.parseInt(order.reference.replace(/\D/g, ""), 10);
    return Number.isNaN(numericRef)
      ? highestValue
      : Math.max(highestValue, numericRef);
  }, 10421);
}

function toCartItem(product: MerchantProduct, quantity: number): CartItem {
  return {
    id: product.id,
    name: product.name,
    supplier: product.supplier,
    unit_price: product.unitPrice,
    min_order: product.minOrder,
    quantity,
  };
}

function toMerchantOrderItems(
  items: CartItem[],
  products: MerchantProduct[]
): MerchantOrderItem[] {
  return items.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return {
      productId: item.id,
      name: item.name,
      supplier: item.supplier,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      packSize: product?.packSize ?? item.min_order,
    };
  });
}

function getLeadTimeDays(items: CartItem[], products: MerchantProduct[]): number {
  return items.reduce((highestLead, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return Math.max(highestLead, product?.leadTimeDays ?? 2);
  }, 1);
}

function slugifyFragment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
}

function buildOrderId(): string {
  return `order-${crypto.randomUUID()}`;
}

function buildDraftActivity(
  order: MerchantOrder,
  reason: DraftLaunchReason,
  productName?: string
): MerchantActivity {
  if (reason === "home-basket") {
    return {
      id: `activity-${order.id}-draft`,
      type: "order",
      tone: "warning",
      title: "Ancien panier recharge",
      detail: `${order.reference} de ${order.supplierName} est revenu dans votre brouillon. Verifiez les articles avant l'envoi.`,
      createdAt: order.createdAt,
    };
  }

  if (reason === "home-low-stock") {
    return {
      id: `activity-${order.id}-draft`,
      type: "order",
      tone: "warning",
      title: "Produit ajoute au panier de reappro",
      detail: `${productName ?? order.items[0]?.name ?? "Produit"} est dans ${order.reference} chez ${order.supplierName}. A confirmer avant la rupture.`,
      createdAt: order.createdAt,
    };
  }

  if (reason === "inventory-reorder") {
    return {
      id: `activity-${order.id}-draft`,
      type: "order",
      tone: "warning",
      title: "Panier de reappro prepare",
      detail: `${productName ?? order.items[0]?.name ?? "Produit"} est ajoute dans ${order.reference} chez ${order.supplierName}. Controlez puis envoyez.`,
      createdAt: order.createdAt,
    };
  }

  return {
    id: `activity-${order.id}-draft`,
    type: "order",
    tone: "warning",
    title: "Panier recharge dans le brouillon",
    detail: `${order.reference} chez ${order.supplierName} est pret pour verification. Ajustez les quantites avant l'envoi.`,
    createdAt: order.createdAt,
  };
}

function getDraftOrderSourceDetail(
  reason: DraftLaunchReason
): MerchantOrderSourceDetail {
  if (reason === "home-low-stock") {
    return "low-stock-reorder";
  }

  if (reason === "inventory-reorder") {
    return "inventory-restock";
  }

  return "saved-basket-reload";
}

function getDraftSupplierName(
  items: CartItem[],
  fallbackSupplierName: string
): string {
  const supplierNames = Array.from(new Set(items.map((item) => item.supplier)));

  if (supplierNames.length === 1) {
    return supplierNames[0];
  }

  if (supplierNames.length > 1) {
    return `${supplierNames.length} suppliers`;
  }

  return fallbackSupplierName;
}

function hasSameOrderItems(
  currentItems: MerchantOrderItem[],
  nextItems: MerchantOrderItem[]
): boolean {
  if (currentItems.length !== nextItems.length) {
    return false;
  }

  return currentItems.every((item, index) => {
    const nextItem = nextItems[index];
    return (
      nextItem != null &&
      item.productId === nextItem.productId &&
      item.name === nextItem.name &&
      item.supplier === nextItem.supplier &&
      item.quantity === nextItem.quantity &&
      item.unitPrice === nextItem.unitPrice &&
      item.packSize === nextItem.packSize
    );
  });
}

function buildCreatedOrderActivity(
  order: MerchantOrder,
  confirmedDraft = false
): MerchantActivity {
  return {
    id: `activity-${order.id}-created`,
    type: "order",
    tone: "success",
    title: confirmedDraft
      ? "Commande envoyee au fournisseur"
      : "Commande creee",
    detail: confirmedDraft
      ? `${order.reference} chez ${order.supplierName} a ete envoyee pour ${formatCdf(order.totalAmount)}. En attente de confirmation fournisseur.`
      : `${order.reference} a ete creee chez ${order.supplierName} pour ${formatCdf(order.totalAmount)}. En attente de confirmation fournisseur.`,
    createdAt: order.createdAt,
  };
}

function buildDraftUpdatedActivity(
  order: MerchantOrder,
  existingActivity?: MerchantActivity | null
): MerchantActivity {
  const title =
    order.sourceDetail === "saved-basket-reload"
      ? "Panier de reappro mis a jour"
      : "Brouillon mis a jour";
  const detail =
    order.items.length === 0
      ? `${order.reference} est maintenant vide. Ajoutez des produits avant l'envoi au fournisseur.`
      : `${order.reference} chez ${order.supplierName} contient ${order.items.length} ligne${order.items.length === 1 ? "" : "s"} pour ${formatCdf(order.totalAmount)}. Encore a verifier avant l'envoi.`;

  return {
    id: `activity-${order.id}-draft-update`,
    type: "order",
    tone: "warning",
    title,
    detail,
    createdAt: existingActivity?.createdAt ?? new Date().toISOString(),
  };
}

function buildDeliveryStatusActivity(
  order: MerchantOrder,
  nextStatus: DeliveryTrackingStatus
): MerchantActivity {
  if (nextStatus === "In Transit") {
    return {
      id: `activity-${order.id}-delivery-transit`,
      type: "delivery",
      tone: "accent",
      title: "Livraison en route",
      detail: `${order.reference} chez ${order.supplierName} est maintenant en route. Arrivee attendue vers ${order.deliveryDate}.`,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: `activity-${order.id}-delivery-received`,
    type: "delivery",
    tone: "success",
    title: "Stock recu au magasin",
    detail: `${order.reference} chez ${order.supplierName} a ete recu pour ${formatCdf(order.totalAmount)}.`,
    createdAt: new Date().toISOString(),
  };
}

function buildRecordedSaleActivity(
  sale: MerchantSale,
  paymentMethod: MerchantSalePaymentMethod,
  quickAddedProduct: boolean
): MerchantActivity {
  return {
    id: `activity-${sale.id}-recorded`,
    type: "sale",
    tone: "accent",
    title: quickAddedProduct
      ? "Produit ajoute puis vendu"
      : "Vente enregistree",
    detail: `${sale.productName} x${sale.quantity} pour ${formatCdf(sale.totalAmount)} via ${paymentMethod}. Il reste ${sale.stockAfterSale} en rayon.`,
    createdAt: sale.soldAt,
  };
}

function buildLowStockSaleActivity(
  sale: MerchantSale,
  stockStatus: MerchantStockStatus
): MerchantActivity {
  return {
    id: `activity-${sale.id}-low-stock`,
    type: "alert",
    tone: "warning",
    title:
      stockStatus === "Out of Stock"
        ? "Rayon vide apres la vente"
        : "Stock a surveiller",
    detail:
      stockStatus === "Out of Stock"
        ? `${sale.productName} est tombe a zero apres la derniere vente. Lancez un reappro avant le prochain rush.`
        : `${sale.productName} n'a plus que ${sale.stockAfterSale} unite${sale.stockAfterSale === 1 ? "" : "s"} apres la derniere vente. Reappro a prevoir bientot.`,
    createdAt: sale.soldAt,
  };
}

function buildVoidedSaleActivity(
  sale: MerchantSale,
  stockAfterVoid: number
): MerchantActivity {
  return {
    id: `activity-${sale.id}-voided`,
    type: "sale",
    tone: "warning",
    title: "Derniere vente annulee",
    detail: `${sale.productName} x${sale.quantity} retire de l'historique. Stock remis a ${stockAfterVoid} unite${stockAfterVoid === 1 ? "" : "s"}.`,
    createdAt: new Date().toISOString(),
  };
}

function buildQuickAddProduct(
  input: QuickAddProductInput,
  quantity: number,
  soldAt: string,
  profile: MerchantState["profile"]
): MerchantProduct {
  const name = input.name.trim();
  const category = input.category.trim();
  const startingStock = input.startingStock ?? quantity;
  const reorderPoint = Math.max(2, Math.ceil(startingStock * 0.4));

  return {
    id: `product-${crypto.randomUUID()}`,
    sku: `KIN-RTL-${slugifyFragment(name).toUpperCase() || "ITEM"}`,
    name,
    category,
    supplier: `Marche de ${profile.neighborhood} Supply`,
    neighborhood: profile.neighborhood,
    unitPrice: estimateCostFromSellingPrice(input.sellingPrice),
    sellingPrice: input.sellingPrice,
    packSize: "1 unit",
    minOrder: "1 unit",
    stockOnHand: startingStock,
    reorderPoint,
    reorderQuantity: Math.max(4, reorderPoint * 2),
    leadTimeDays: 1,
    lastRestockedAt: soldAt,
  };
}

export function MerchantDataProvider({
  children,
  merchantId,
  initialState,
}: MerchantDataProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<MerchantState>(initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const orders = [...state.orders].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  const inventory = buildInventoryProducts(state.products, orders).sort(
    (left, right) => {
      const leftScore =
        left.stockStatus === "Out of Stock"
          ? 0
          : left.stockStatus === "Low Stock"
            ? 1
            : 2;
      const rightScore =
        right.stockStatus === "Out of Stock"
          ? 0
          : right.stockStatus === "Low Stock"
            ? 1
            : 2;

      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.name.localeCompare(right.name);
    }
  );
  const activeOrders = orders.filter((order) => isActiveOrder(order.status));
  const sales = [...state.sales].sort(
    (left, right) =>
      new Date(right.soldAt).getTime() - new Date(left.soldAt).getTime()
  );
  const todaySales = sales.filter((sale) =>
    isSameCalendarDay(sale.soldAt, new Date())
  );
  const topSellingProducts = Object.values(
    todaySales.reduce<Record<string, TopSellingProduct>>((collection, sale) => {
      if (!collection[sale.productId]) {
        collection[sale.productId] = {
          productId: sale.productId,
          productName: sale.productName,
          unitsSold: 0,
          revenue: 0,
        };
      }

      collection[sale.productId].unitsSold += sale.quantity;
      collection[sale.productId].revenue += sale.totalAmount;
      return collection;
    }, {})
  )
    .sort((left, right) => right.unitsSold - left.unitsSold)
    .slice(0, 3);
  const lowStockProducts = inventory.filter(
    (product) => product.stockStatus !== "Healthy"
  );
  const salesLowStockInsights = sales
    .filter((sale) => sale.triggeredLowStock)
    .reduce<SalesLowStockInsight[]>((collection, sale) => {
      if (collection.some((entry) => entry.productId === sale.productId)) {
        return collection;
      }

      const product = inventory.find((entry) => entry.id === sale.productId);
      collection.push({
        saleId: sale.id,
        productId: sale.productId,
        productName: sale.productName,
        quantitySold: sale.quantity,
        stockAfterSale: sale.stockAfterSale,
        soldAt: sale.soldAt,
        stockStatus: product?.stockStatus ?? "Low Stock",
      });
      return collection;
    }, [])
    .slice(0, 3);
  const recentActivity = [...state.activities]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 8);
  const lastOrder = orders[0] ?? null;
  const lastSuccessfulOrder =
    orders.find((order) => order.status === "Delivered") ?? null;

  const upsertActivities = useCallback(
    async (activities: MerchantActivity[]) => {
      if (activities.length === 0) return;

      const { error } = await supabase
        .from("activity_feed")
        .upsert(
          activities.map((activity) => toActivityFeedRow(merchantId, activity)),
          {
            onConflict: "id",
          }
        );

      if (error) {
        throw new Error(`Unable to save merchant activity: ${error.message}`);
      }
    },
    [merchantId, supabase]
  );

  const deleteActivities = useCallback(
    async (activityIds: string[]) => {
      if (activityIds.length === 0) return;

      const { error } = await supabase
        .from("activity_feed")
        .delete()
        .eq("merchant_id", merchantId)
        .in("id", activityIds);

      if (error) {
        throw new Error(`Unable to remove merchant activity: ${error.message}`);
      }
    },
    [merchantId, supabase]
  );

  const upsertInventoryProducts = useCallback(
    async (products: MerchantProduct[]) => {
      if (products.length === 0) return;

      const { error } = await supabase
        .from("inventory_items")
        .upsert(products.map((product) => toInventoryItemRow(merchantId, product)), {
          onConflict: "id",
        });

      if (error) {
        throw new Error(`Unable to save inventory changes: ${error.message}`);
      }
    },
    [merchantId, supabase]
  );

  const upsertOrders = useCallback(
    async (ordersToSave: Array<{ order: MerchantOrder; etaAt: string | null }>) => {
      if (ordersToSave.length === 0) return;

      const { error } = await supabase.from("supplier_orders").upsert(
        ordersToSave.map(({ order, etaAt }) =>
          toSupplierOrderRow(merchantId, order, etaAt)
        ),
        { onConflict: "id" }
      );

      if (error) {
        throw new Error(`Unable to save supplier orders: ${error.message}`);
      }
    },
    [merchantId, supabase]
  );

  const replaceOrderItems = useCallback(
    async (orderId: string, items: MerchantOrderItem[]) => {
      const { error: deleteError } = await supabase
        .from("supplier_order_items")
        .delete()
        .eq("merchant_id", merchantId)
        .eq("supplier_order_id", orderId);

      if (deleteError) {
        throw new Error(`Unable to replace order lines: ${deleteError.message}`);
      }

      if (items.length === 0) {
        return;
      }

      const { error: insertError } = await supabase
        .from("supplier_order_items")
        .insert(toSupplierOrderItemRows(merchantId, orderId, items));

      if (insertError) {
        throw new Error(`Unable to save order lines: ${insertError.message}`);
      }
    },
    [merchantId, supabase]
  );

  function findProduct(productId: string): InventoryProduct | undefined {
    return inventory.find((product) => product.id === productId);
  }

  function buildDraftFromProduct(productId: string): CartItem[] {
    const product = state.products.find((entry) => entry.id === productId);
    if (!product) return [];
    return [toCartItem(product, product.reorderQuantity)];
  }

  function buildDraftFromOrder(orderId: string): CartItem[] {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return [];

    return order.items.map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      if (product) {
        return toCartItem(product, item.quantity);
      }

      return {
        id: item.productId,
        name: item.name,
        supplier: item.supplier,
        unit_price: item.unitPrice,
        min_order: item.packSize || "1 case",
        quantity: item.quantity,
      };
    });
  }

  const recordSale = useCallback(
    async ({
      productId,
      quantity,
      unitPrice,
      paymentMethod,
      soldAt,
      quickAddProduct,
    }: RecordSaleInput): Promise<MerchantSale> => {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Quantity must be at least 1.");
      }

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new Error("Enter a valid selling price in CDF.");
      }

      if (!soldAt || Number.isNaN(new Date(soldAt).getTime())) {
        throw new Error("Choose a valid sale time.");
      }

      const currentState = stateRef.current;
      let product =
        productId != null
          ? currentState.products.find((entry) => entry.id === productId) ?? null
          : null;
      let quickAdded = false;

      if (!product) {
        if (!quickAddProduct) {
          throw new Error("Select a product or quick-add a new one first.");
        }

        if (!quickAddProduct.name.trim()) {
          throw new Error("Enter a product name for the new item.");
        }

        if (!quickAddProduct.category.trim()) {
          throw new Error("Choose a category for the new item.");
        }

        if (
          !Number.isFinite(quickAddProduct.sellingPrice) ||
          quickAddProduct.sellingPrice <= 0
        ) {
          throw new Error("Enter a valid selling price for the new item.");
        }

        if (
          quickAddProduct.startingStock != null &&
          quickAddProduct.startingStock < quantity
        ) {
          throw new Error("Starting stock must cover the quantity being sold.");
        }

        product = buildQuickAddProduct(
          quickAddProduct,
          quantity,
          soldAt,
          currentState.profile
        );
        quickAdded = true;
      }

      if (product.stockOnHand < quantity) {
        throw new Error(
          `${product.name} n'a que ${product.stockOnHand} unite${product.stockOnHand === 1 ? "" : "s"} en stock. Reduisez la quantite ou reapprovisionnez d'abord.`
        );
      }

      const previousStatus = getStockStatus(
        product.stockOnHand,
        product.reorderPoint
      );
      const stockAfterSale = product.stockOnHand - quantity;
      const nextStatus = getStockStatus(stockAfterSale, product.reorderPoint);
      const sale: MerchantSale = {
        id: `sale-${crypto.randomUUID()}`,
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice,
        paymentMethod,
        soldAt,
        stockAfterSale,
        triggeredLowStock:
          previousStatus === "Healthy" && nextStatus !== "Healthy",
        quickAddedProduct: quickAdded || undefined,
      };
      const updatedProduct: MerchantProduct = {
        ...product,
        stockOnHand: stockAfterSale,
        sellingPrice: unitPrice,
      };
      const nextProducts = quickAdded
        ? [updatedProduct, ...currentState.products]
        : currentState.products.map((entry) =>
            entry.id === updatedProduct.id ? updatedProduct : entry
          );
      const saleActivity = buildRecordedSaleActivity(
        sale,
        paymentMethod,
        quickAdded
      );
      const lowStockActivity = sale.triggeredLowStock
        ? buildLowStockSaleActivity(sale, nextStatus)
        : null;

      await upsertInventoryProducts([updatedProduct]);

      const { error: saleError } = await supabase
        .from("sales")
        .insert(toSaleRow(merchantId, sale));

      if (saleError) {
        throw new Error(`Unable to save the sale: ${saleError.message}`);
      }

      await upsertActivities(
        lowStockActivity ? [saleActivity, lowStockActivity] : [saleActivity]
      );

      setState((current) => ({
        ...current,
        products: nextProducts,
        sales: [sale, ...current.sales],
        activities: lowStockActivity
          ? [lowStockActivity, saleActivity, ...current.activities].slice(0, 20)
          : [saleActivity, ...current.activities].slice(0, 20),
      }));

      return sale;
    },
    [merchantId, supabase, upsertActivities, upsertInventoryProducts]
  );

  const voidLatestSale = useCallback(async (): Promise<MerchantSale | null> => {
    const currentState = stateRef.current;

    if (currentState.sales.length === 0) {
      return null;
    }

    const latestSale = currentState.sales.reduce((latest, candidate) =>
      new Date(candidate.soldAt).getTime() > new Date(latest.soldAt).getTime()
        ? candidate
        : latest
    );
    const product = currentState.products.find(
      (entry) => entry.id === latestSale.productId
    );

    if (!product) {
      return null;
    }

    const restoredStock = product.stockOnHand + latestSale.quantity;
    const updatedProduct: MerchantProduct = {
      ...product,
      stockOnHand: restoredStock,
    };
    const voidedActivity = buildVoidedSaleActivity(latestSale, restoredStock);

    await upsertInventoryProducts([updatedProduct]);

    const { error: deleteSaleError } = await supabase
      .from("sales")
      .delete()
      .eq("merchant_id", merchantId)
      .eq("id", latestSale.id);

    if (deleteSaleError) {
      throw new Error(`Unable to remove the sale: ${deleteSaleError.message}`);
    }

    await deleteActivities([
      `activity-${latestSale.id}-recorded`,
      `activity-${latestSale.id}-low-stock`,
    ]);
    await upsertActivities([voidedActivity]);

    setState((current) => ({
      ...current,
      products: current.products.map((entry) =>
        entry.id === updatedProduct.id ? updatedProduct : entry
      ),
      sales: current.sales.filter((sale) => sale.id !== latestSale.id),
      activities: [
        voidedActivity,
        ...current.activities.filter(
          (activity) =>
            activity.id !== `activity-${latestSale.id}-recorded` &&
            activity.id !== `activity-${latestSale.id}-low-stock`
        ),
      ].slice(0, 20),
    }));

    return latestSale;
  }, [
    deleteActivities,
    merchantId,
    supabase,
    upsertActivities,
    upsertInventoryProducts,
  ]);

  const launchDraftOrder = useCallback(
    async ({
      items,
      source,
      reason,
      productName,
    }: LaunchDraftOrderInput): Promise<MerchantOrder | null> => {
      if (items.length === 0) return null;

      const currentState = stateRef.current;
      const createdAt = new Date().toISOString();
      const nextSequence = getNextOrderSequence(currentState.orders) + 1;
      const lineItems = toMerchantOrderItems(items, currentState.products);
      const etaAt = addDays(createdAt, getLeadTimeDays(items, currentState.products));
      const draftOrder: MerchantOrder = {
        id: buildOrderId(),
        reference: `ZND-${String(nextSequence).padStart(5, "0")}`,
        supplierName: items[0].supplier,
        status: "Draft",
        source,
        sourceDetail: getDraftOrderSourceDetail(reason),
        createdAt,
        orderDate: formatShortDate(createdAt),
        deliveryDate: formatShortDate(etaAt),
        deliveryAddress: "Delivery details pending",
        items: lineItems,
        totalAmount: lineItems.reduce(
          (runningTotal, item) => runningTotal + item.quantity * item.unitPrice,
          0
        ),
      };
      const activity = buildDraftActivity(draftOrder, reason, productName);

      await upsertOrders([{ order: draftOrder, etaAt }]);
      await replaceOrderItems(draftOrder.id, lineItems);
      await upsertActivities([activity]);

      setState((current) => ({
        ...current,
        orders: [draftOrder, ...current.orders.filter((order) => order.id !== draftOrder.id)],
        activities: [activity, ...current.activities].slice(0, 20),
      }));

      return draftOrder;
    },
    [replaceOrderItems, upsertActivities, upsertOrders]
  );

  const syncDraftOrder = useCallback(
    async ({ draftOrderId, items }: SyncDraftOrderInput) => {
      const currentState = stateRef.current;
      const draftOrder = currentState.orders.find(
        (order) => order.id === draftOrderId && order.status === "Draft"
      );

      if (!draftOrder) {
        return;
      }

      const nextLineItems = toMerchantOrderItems(items, currentState.products);
      const nextSupplierName = getDraftSupplierName(items, draftOrder.supplierName);
      const nextTotalAmount = nextLineItems.reduce(
        (runningTotal, item) => runningTotal + item.quantity * item.unitPrice,
        0
      );
      const etaAt =
        nextLineItems.length > 0
          ? addDays(
              draftOrder.createdAt,
              getLeadTimeDays(items, currentState.products)
            )
          : null;
      const nextDeliveryDate = etaAt
        ? formatShortDate(etaAt)
        : draftOrder.deliveryDate;
      const draftUnchanged =
        draftOrder.supplierName === nextSupplierName &&
        draftOrder.totalAmount === nextTotalAmount &&
        draftOrder.deliveryDate === nextDeliveryDate &&
        hasSameOrderItems(draftOrder.items, nextLineItems);

      if (draftUnchanged) {
        return;
      }

      const nextDraftOrder: MerchantOrder = {
        ...draftOrder,
        supplierName: nextSupplierName,
        deliveryDate: nextDeliveryDate,
        items: nextLineItems,
        totalAmount: nextTotalAmount,
      };
      const existingUpdateActivity =
        currentState.activities.find(
          (activity) => activity.id === `activity-${draftOrder.id}-draft-update`
        ) ?? null;
      const nextActivity = buildDraftUpdatedActivity(
        nextDraftOrder,
        existingUpdateActivity
      );

      await upsertOrders([{ order: nextDraftOrder, etaAt }]);
      await replaceOrderItems(nextDraftOrder.id, nextLineItems);
      await upsertActivities([nextActivity]);

      setState((current) => {
        const remainingActivities = current.activities.filter(
          (activity) =>
            activity.id !== `activity-${draftOrder.id}-draft-update` &&
            activity.id !== `activity-${draftOrder.id}-draft`
        );

        return {
          ...current,
          orders: current.orders.map((order) =>
            order.id === draftOrder.id ? nextDraftOrder : order
          ),
          activities: [nextActivity, ...remainingActivities].slice(0, 20),
        };
      });
    },
    [replaceOrderItems, upsertActivities, upsertOrders]
  );

  const updateDeliveryStatus = useCallback(
    async (
      orderId: string,
      nextStatus: DeliveryTrackingStatus
    ): Promise<MerchantOrder | null> => {
      const currentState = stateRef.current;
      const currentOrder = currentState.orders.find((order) => order.id === orderId);

      if (!currentOrder || !isTrackedDeliveryOrder(currentOrder.status)) {
        return null;
      }

      const currentDeliveryStatus = getDeliveryTrackingStatus(currentOrder.status);
      const expectedNextStatus = getNextDeliveryTrackingStatus(currentOrder.status);
      if (currentDeliveryStatus == null || nextStatus !== expectedNextStatus) {
        return null;
      }

      const nextOrder: MerchantOrder = {
        ...currentOrder,
        status: nextStatus === "Delivered" ? "Delivered" : "In Transit",
      };
      const nextProducts =
        nextStatus === "Delivered"
          ? currentState.products.map((product) => {
              const matchingItem = currentOrder.items.find(
                (item) => item.productId === product.id
              );

              if (!matchingItem) {
                return product;
              }

              return {
                ...product,
                stockOnHand: product.stockOnHand + matchingItem.quantity,
                lastRestockedAt: new Date().toISOString(),
              };
            })
          : currentState.products;
      const updatedProducts = nextProducts.filter((product) =>
        currentOrder.items.some((item) => item.productId === product.id)
      );
      const etaAt = addDays(
        nextOrder.createdAt,
        getLeadTimeDays(
          nextOrder.items.map((item) => ({
            id: item.productId,
            name: item.name,
            supplier: item.supplier,
            unit_price: item.unitPrice,
            min_order: item.packSize,
            quantity: item.quantity,
          })),
          currentState.products
        )
      );
      const activity = buildDeliveryStatusActivity(nextOrder, nextStatus);

      await upsertOrders([{ order: nextOrder, etaAt }]);

      if (nextStatus === "Delivered") {
        await upsertInventoryProducts(updatedProducts);
      }

      const { error: deliveryError } = await supabase
        .from("delivery_updates")
        .insert(
          toDeliveryUpdateRow(merchantId, orderId, nextOrder.status, activity.title)
        );

      if (deliveryError) {
        throw new Error(`Unable to save delivery update: ${deliveryError.message}`);
      }

      await upsertActivities([activity]);

      setState((current) => ({
        ...current,
        products: nextStatus === "Delivered" ? nextProducts : current.products,
        orders: current.orders.map((order) =>
          order.id === orderId ? nextOrder : order
        ),
        activities: [activity, ...current.activities].slice(0, 20),
      }));

      return nextOrder;
    },
    [merchantId, supabase, upsertActivities, upsertInventoryProducts, upsertOrders]
  );

  const createOrders = useCallback(
    async ({
      items,
      deliveryAddress,
      notes,
      source = "Orders",
      sourceDetail = "manual-new-order",
      draftOrderId,
    }: CreateOrdersInput): Promise<MerchantOrder[]> => {
      if (items.length === 0) {
        return [];
      }

      const currentState = stateRef.current;
      const itemsBySupplier = items.reduce<Record<string, CartItem[]>>(
        (collection, item) => {
          if (!collection[item.supplier]) {
            collection[item.supplier] = [];
          }
          collection[item.supplier].push(item);
          return collection;
        },
        {}
      );

      const existingDraft =
        draftOrderId != null
          ? currentState.orders.find(
              (order) => order.id === draftOrderId && order.status === "Draft"
            ) ?? null
          : null;

      let nextSequence = getNextOrderSequence(currentState.orders);

      const createdOrders = Object.entries(itemsBySupplier).map(
        ([supplierName, supplierItems], index) => {
          const createdAt = new Date(Date.now() + index * 60_000).toISOString();
          const lineItems = toMerchantOrderItems(supplierItems, currentState.products);
          const totalAmount = lineItems.reduce(
            (runningTotal, item) => runningTotal + item.quantity * item.unitPrice,
            0
          );
          const etaAt = addDays(
            createdAt,
            getLeadTimeDays(supplierItems, currentState.products)
          );

          if (existingDraft && index === 0) {
            return {
              order: {
                ...existingDraft,
                supplierName,
                status: "Pending" as const,
                source: existingDraft.source,
                sourceDetail: existingDraft.sourceDetail ?? sourceDetail,
                createdAt,
                orderDate: formatShortDate(createdAt),
                deliveryDate: formatShortDate(etaAt),
                deliveryAddress,
                notes,
                items: lineItems,
                totalAmount,
              },
              etaAt,
            };
          }

          nextSequence += 1;

          return {
            order: {
              id: buildOrderId(),
              reference: `ZND-${String(nextSequence).padStart(5, "0")}`,
              supplierName,
              status: "Pending" as const,
              source: existingDraft?.source ?? source,
              sourceDetail: existingDraft?.sourceDetail ?? sourceDetail,
              createdAt,
              orderDate: formatShortDate(createdAt),
              deliveryDate: formatShortDate(etaAt),
              deliveryAddress,
              notes,
              items: lineItems,
              totalAmount,
            },
            etaAt,
          };
        }
      );

      const createdActivities = createdOrders.map(({ order }) =>
        buildCreatedOrderActivity(order, order.id === existingDraft?.id)
      );

      await upsertOrders(createdOrders);
      await Promise.all(
        createdOrders.map(({ order }) => replaceOrderItems(order.id, order.items))
      );
      await upsertActivities(createdActivities);

      setState((current) => ({
        ...current,
        orders: [
          ...createdOrders.map(({ order }) => order),
          ...current.orders.filter(
            (order) =>
              order.id !== existingDraft?.id &&
              !createdOrders.some((entry) => entry.order.id === order.id)
          ),
        ],
        activities: [...createdActivities, ...current.activities].slice(0, 20),
      }));

      return createdOrders.map(({ order }) => order);
    },
    [replaceOrderItems, upsertActivities, upsertOrders]
  );

  return (
    <MerchantDataContext.Provider
      value={{
        state,
        inventory,
        orders,
        activeOrders,
        lowStockProducts,
        sales,
        todaySales,
        topSellingProducts,
        salesLowStockInsights,
        recentActivity,
        lastOrder,
        lastSuccessfulOrder,
        createOrders,
        launchDraftOrder,
        syncDraftOrder,
        updateDeliveryStatus,
        recordSale,
        voidLatestSale,
        buildDraftFromProduct,
        buildDraftFromOrder,
        findProduct,
      }}
    >
      {children}
    </MerchantDataContext.Provider>
  );
}

export function useMerchantData(): MerchantDataContextValue {
  const context = useContext(MerchantDataContext);

  if (!context) {
    throw new Error(
      "useMerchantData must be used within a MerchantDataProvider"
    );
  }

  return context;
}
