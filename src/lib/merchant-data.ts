export type MerchantStockStatus = "Healthy" | "Low Stock" | "Out of Stock";
export type MerchantOrderStatus =
  | "Draft"
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "In Transit"
  | "Delivered"
  | "Cancelled";
export type MerchantSalePaymentMethod = "Cash" | "Mobile Money" | "Card";
export type MerchantOrderSourceDetail =
  | "manual-new-order"
  | "quick-reorder"
  | "low-stock-reorder"
  | "inventory-restock"
  | "saved-basket-reload";

export interface MerchantProfile {
  storeName: string;
  neighborhood: string;
  city: string;
}

export interface MerchantProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  neighborhood: string;
  unitPrice: number;
  sellingPrice: number;
  packSize: string;
  minOrder: string;
  stockOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  leadTimeDays: number;
  lastRestockedAt: string;
}

export interface MerchantOrderItem {
  productId: string;
  name: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  packSize: string;
}

export interface MerchantOrder {
  id: string;
  reference: string;
  supplierName: string;
  status: MerchantOrderStatus;
  source: "Inventory" | "Orders" | "Home";
  sourceDetail?: MerchantOrderSourceDetail;
  createdAt: string;
  orderDate: string;
  deliveryDate: string;
  deliveryAddress: string;
  notes?: string;
  items: MerchantOrderItem[];
  totalAmount: number;
}

export interface MerchantActivity {
  id: string;
  type: "alert" | "order" | "delivery" | "sale";
  tone: "accent" | "warning" | "success";
  title: string;
  detail: string;
  createdAt: string;
}

export interface MerchantSale {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: MerchantSalePaymentMethod;
  soldAt: string;
  stockAfterSale: number;
  triggeredLowStock: boolean;
  quickAddedProduct?: boolean;
}

export interface MerchantState {
  profile: MerchantProfile;
  products: MerchantProduct[];
  orders: MerchantOrder[];
  activities: MerchantActivity[];
  sales: MerchantSale[];
}

export interface InventoryProduct extends MerchantProduct {
  stockStatus: MerchantStockStatus;
  onOrder: number;
}

export const MERCHANT_STATE_STORAGE_KEY = "zando_merchant_state_v2";
export const DEFAULT_MERCHANT_PROFILE: MerchantProfile = {
  storeName: "Mama Mireille Mini Market",
  neighborhood: "Masina",
  city: "Kinshasa",
};

export const ORDER_STATUS_COLORS: Record<MerchantOrderStatus, string> = {
  Draft: "text-slate-200 bg-slate-500/10 border-slate-500/20",
  Pending: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
  Confirmed: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  Packed: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  "In Transit": "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
  Delivered: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  Cancelled: "text-rose-300 bg-rose-500/10 border-rose-500/20",
};

export const DELIVERY_TRACKING_STATUSES = [
  "Pending",
  "In Transit",
  "Delivered",
] as const;

export type DeliveryTrackingStatus = (typeof DELIVERY_TRACKING_STATUSES)[number];

export function formatCdf(amount: number): string {
  return `CDF ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function getMerchantOrderSourceDetail(
  order: Pick<MerchantOrder, "source" | "sourceDetail">
): MerchantOrderSourceDetail {
  if (order.sourceDetail) {
    return order.sourceDetail;
  }

  if (order.source === "Inventory") {
    return "inventory-restock";
  }

  if (order.source === "Home") {
    return "quick-reorder";
  }

  return "manual-new-order";
}

export function getMerchantOrderSourceLabel(
  order: Pick<MerchantOrder, "source" | "sourceDetail">
): string {
  const sourceDetail = getMerchantOrderSourceDetail(order);

  if (sourceDetail === "quick-reorder") return "Quick reorder";
  if (sourceDetail === "low-stock-reorder") return "Quick reorder";
  if (sourceDetail === "inventory-restock") return "Inventory restock";
  if (sourceDetail === "saved-basket-reload") return "From previous basket";
  return "Manual order";
}

export function getMerchantOrderStatusLabel(
  status: MerchantOrderStatus
): string {
  if (status === "Draft") return "Saved draft";
  if (status === "Pending") return "Waiting supplier confirmation";
  if (status === "Confirmed") return "Supplier confirmed";
  if (status === "Packed") return "Being packed";
  if (status === "In Transit") return "On the way";
  return status;
}

export function getDeliveryTrackingStatusLabel(
  status: DeliveryTrackingStatus
): string {
  if (status === "Pending") return "Awaiting supplier confirmation";
  if (status === "In Transit") return "On the way";
  return "Received";
}

export function getDeliveryTrackingStatus(
  status: MerchantOrderStatus
): DeliveryTrackingStatus | null {
  if (status === "Draft" || status === "Cancelled") {
    return null;
  }

  if (status === "Pending") {
    return "Pending";
  }

  if (status === "Delivered") {
    return "Delivered";
  }

  return "In Transit";
}

export function isEditableMerchantOrder(
  status: MerchantOrderStatus
): boolean {
  return status === "Draft";
}

export function isTrackedDeliveryOrder(
  status: MerchantOrderStatus
): boolean {
  return getDeliveryTrackingStatus(status) != null;
}

export function getNextDeliveryTrackingStatus(
  status: MerchantOrderStatus
): DeliveryTrackingStatus | null {
  const currentStatus = getDeliveryTrackingStatus(status);
  if (!currentStatus || currentStatus === "Delivered") {
    return null;
  }

  if (currentStatus === "Pending") {
    return "In Transit";
  }

  return "Delivered";
}

export function isWaitingSupplierMerchantOrder(
  status: MerchantOrderStatus
): boolean {
  return status === "Pending";
}

export function isOnTheWayMerchantOrder(
  status: MerchantOrderStatus
): boolean {
  return status === "Confirmed" || status === "Packed" || status === "In Transit";
}

export function isDeliveredMerchantOrder(
  status: MerchantOrderStatus
): boolean {
  return status === "Delivered";
}

export function getMerchantOrderStatusDescription(
  status: MerchantOrderStatus
): string {
  if (status === "Draft") {
    return "This basket is saved, still editable, and not yet sent to the supplier.";
  }

  if (status === "Pending") {
    return "This order is already sent and is waiting for the supplier to confirm it.";
  }

  if (status === "Confirmed") {
    return "This order is already placed and the supplier has confirmed it.";
  }

  if (status === "Packed") {
    return "This order is already placed and is being packed before dispatch.";
  }

  if (status === "In Transit") {
    return "This order is already placed and is on the way to the shop.";
  }

  if (status === "Delivered") {
    return "This order has already reached the shop.";
  }

  return "This order was cancelled before completion.";
}

export function getMerchantOrderTotalUnits(order: Pick<MerchantOrder, "items">): number {
  return order.items.reduce(
    (runningTotal, item) => runningTotal + item.quantity,
    0
  );
}

export function getMerchantOrderItemPreview(
  order: Pick<MerchantOrder, "items">,
  limit = 3
): string[] {
  return order.items
    .slice(0, limit)
    .map((item) => `${item.name} x${item.quantity}`);
}

export function formatMerchantAddress(address: string): string {
  return address
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
}

export function getMerchantActivityLabel(
  activity: Pick<MerchantActivity, "type" | "tone">
): string {
  if (activity.type === "delivery" && activity.tone === "success") {
    return "Livre";
  }

  if (activity.type === "order" && activity.tone === "success") {
    return "Envoyee";
  }

  if (activity.type === "order" && activity.tone === "warning") {
    return "A confirmer";
  }

  if (activity.type === "alert") {
    return "A traiter";
  }

  if (activity.type === "sale") {
    return "Vente";
  }

  return "Info";
}

export function formatRelativeActivity(dateString: string): string {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return formatShortDate(dateString);
}

export function isActiveOrder(status: MerchantOrderStatus): boolean {
  return status !== "Delivered" && status !== "Cancelled";
}

export function getStockStatus(
  stockOnHand: number,
  reorderPoint: number
): MerchantStockStatus {
  if (stockOnHand <= 0) return "Out of Stock";
  if (stockOnHand <= reorderPoint) return "Low Stock";
  return "Healthy";
}

export function estimateSellingPrice(costPrice: number): number {
  return Math.max(500, Math.round(costPrice * 1.18));
}

export function estimateCostFromSellingPrice(sellingPrice: number): number {
  return Math.max(300, Math.round(sellingPrice * 0.82));
}

function withDays(dateString: string, days: number): string {
  const nextDate = new Date(dateString);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString();
}

const SEEDED_PRODUCTS: MerchantProduct[] = [
  {
    id: "riz-bella-25kg",
    sku: "KIN-STP-001",
    name: "Riz Bella 25kg",
    category: "Staples",
    supplier: "Marche Gambela Cash & Carry",
    neighborhood: "Gombe",
    unitPrice: 98200,
    sellingPrice: 112000,
    packSize: "25 kg sack",
    minOrder: "1 sack",
    stockOnHand: 14,
    reorderPoint: 8,
    reorderQuantity: 12,
    leadTimeDays: 2,
    lastRestockedAt: "2026-04-04T08:20:00.000Z",
  },
  {
    id: "sucre-kwilu-5kg",
    sku: "KIN-STP-008",
    name: "Sucre Kwilu 5kg",
    category: "Staples",
    supplier: "Kasa-Vubu Family Wholesale",
    neighborhood: "Kasa-Vubu",
    unitPrice: 24100,
    sellingPrice: 28500,
    packSize: "5 kg bag",
    minOrder: "2 bags",
    stockOnHand: 6,
    reorderPoint: 8,
    reorderQuantity: 10,
    leadTimeDays: 2,
    lastRestockedAt: "2026-04-02T09:40:00.000Z",
  },
  {
    id: "farine-froment-10kg",
    sku: "KIN-STP-013",
    name: "Farine de Froment 10kg",
    category: "Staples",
    supplier: "Marche Gambela Cash & Carry",
    neighborhood: "Gombe",
    unitPrice: 32750,
    sellingPrice: 38200,
    packSize: "10 kg bag",
    minOrder: "2 bags",
    stockOnHand: 11,
    reorderPoint: 6,
    reorderQuantity: 8,
    leadTimeDays: 2,
    lastRestockedAt: "2026-04-05T10:10:00.000Z",
  },
  {
    id: "huile-selleta-5l",
    sku: "KIN-PAN-021",
    name: "Selleta Oil 5L",
    category: "Pantry",
    supplier: "Matete FMCG Center",
    neighborhood: "Matete",
    unitPrice: 38800,
    sellingPrice: 45500,
    packSize: "5 litre jerrycan",
    minOrder: "1 jerrycan",
    stockOnHand: 3,
    reorderPoint: 5,
    reorderQuantity: 6,
    leadTimeDays: 3,
    lastRestockedAt: "2026-03-31T14:00:00.000Z",
  },
  {
    id: "tomate-tmt-48",
    sku: "KIN-PAN-034",
    name: "TMT Tomato Paste 48 x 70g",
    category: "Pantry",
    supplier: "Marche Gambela Cash & Carry",
    neighborhood: "Gombe",
    unitPrice: 45900,
    sellingPrice: 53600,
    packSize: "48-tin carton",
    minOrder: "1 carton",
    stockOnHand: 12,
    reorderPoint: 7,
    reorderQuantity: 8,
    leadTimeDays: 2,
    lastRestockedAt: "2026-04-06T07:45:00.000Z",
  },
  {
    id: "sel-io-25",
    sku: "KIN-PAN-041",
    name: "Sel Iode 25 x 500g",
    category: "Pantry",
    supplier: "Kintambo Pantry Depot",
    neighborhood: "Kintambo",
    unitPrice: 19800,
    sellingPrice: 23600,
    packSize: "25-pack carton",
    minOrder: "1 carton",
    stockOnHand: 0,
    reorderPoint: 4,
    reorderQuantity: 6,
    leadTimeDays: 2,
    lastRestockedAt: "2026-03-28T15:20:00.000Z",
  },
  {
    id: "fanta-orange-24",
    sku: "KIN-BEV-005",
    name: "Fanta Orange 24 x 50cl",
    category: "Beverages",
    supplier: "Bandal Beverage Hub",
    neighborhood: "Bandalungwa",
    unitPrice: 86400,
    sellingPrice: 100800,
    packSize: "24-bottle crate",
    minOrder: "1 crate",
    stockOnHand: 10,
    reorderPoint: 6,
    reorderQuantity: 8,
    leadTimeDays: 1,
    lastRestockedAt: "2026-04-07T06:50:00.000Z",
  },
  {
    id: "coca-cola-24",
    sku: "KIN-BEV-002",
    name: "Coca-Cola 24 x 50cl",
    category: "Beverages",
    supplier: "Bandal Beverage Hub",
    neighborhood: "Bandalungwa",
    unitPrice: 88200,
    sellingPrice: 102500,
    packSize: "24-bottle crate",
    minOrder: "1 crate",
    stockOnHand: 0,
    reorderPoint: 5,
    reorderQuantity: 10,
    leadTimeDays: 1,
    lastRestockedAt: "2026-03-30T07:10:00.000Z",
  },
  {
    id: "primus-12",
    sku: "KIN-BEV-019",
    name: "Primus 12 x 72cl",
    category: "Beverages",
    supplier: "Ngaliema Drinks Depot",
    neighborhood: "Ngaliema",
    unitPrice: 74200,
    sellingPrice: 86800,
    packSize: "12-bottle case",
    minOrder: "2 cases",
    stockOnHand: 4,
    reorderPoint: 5,
    reorderQuantity: 8,
    leadTimeDays: 2,
    lastRestockedAt: "2026-04-01T11:15:00.000Z",
  },
  {
    id: "vitalo-water-30",
    sku: "KIN-BEV-027",
    name: "Vitalo Water 30 x 500ml",
    category: "Beverages",
    supplier: "Bandal Beverage Hub",
    neighborhood: "Bandalungwa",
    unitPrice: 35100,
    sellingPrice: 41200,
    packSize: "30-bottle pack",
    minOrder: "2 packs",
    stockOnHand: 5,
    reorderPoint: 8,
    reorderQuantity: 12,
    leadTimeDays: 1,
    lastRestockedAt: "2026-04-03T08:55:00.000Z",
  },
  {
    id: "omo-powder-24",
    sku: "KIN-HOM-012",
    name: "Omo Powder 24 x 900g",
    category: "Home Care",
    supplier: "Ngaba Homecare Supply",
    neighborhood: "Ngaba",
    unitPrice: 69300,
    sellingPrice: 80800,
    packSize: "24-pack bale",
    minOrder: "1 bale",
    stockOnHand: 9,
    reorderPoint: 6,
    reorderQuantity: 6,
    leadTimeDays: 2,
    lastRestockedAt: "2026-04-06T09:25:00.000Z",
  },
  {
    id: "savon-mama-48",
    sku: "KIN-HOM-016",
    name: "Savon Mama 48-bar Carton",
    category: "Home Care",
    supplier: "Ngaba Homecare Supply",
    neighborhood: "Ngaba",
    unitPrice: 51800,
    sellingPrice: 60800,
    packSize: "48-bar carton",
    minOrder: "1 carton",
    stockOnHand: 2,
    reorderPoint: 4,
    reorderQuantity: 6,
    leadTimeDays: 2,
    lastRestockedAt: "2026-03-29T13:30:00.000Z",
  },
];

export function getSeedInventoryProducts(): MerchantProduct[] {
  return SEEDED_PRODUCTS.map((product) => ({ ...product }));
}

function buildSeedOrderItem(
  productId: string,
  quantity: number
): MerchantOrderItem {
  const product = SEEDED_PRODUCTS.find((entry) => entry.id === productId);

  if (!product) {
    throw new Error(`Missing seeded product for ${productId}`);
  }

  return {
    productId: product.id,
    name: product.name,
    supplier: product.supplier,
    quantity,
    unitPrice: product.unitPrice,
    packSize: product.packSize,
  };
}

function buildSeedOrder(
  order: Omit<MerchantOrder, "items" | "totalAmount"> & {
    items: Array<{ productId: string; quantity: number }>;
  }
): MerchantOrder {
  const items = order.items.map((item) =>
    buildSeedOrderItem(item.productId, item.quantity)
  );

  return {
    ...order,
    items,
    totalAmount: items.reduce(
      (runningTotal, item) => runningTotal + item.quantity * item.unitPrice,
      0
    ),
  };
}

function buildSeedSale(
  sale: Omit<MerchantSale, "productName" | "category" | "totalAmount" | "unitPrice"> & {
    productId: string;
    unitPrice?: number;
  }
): MerchantSale {
  const product = SEEDED_PRODUCTS.find((entry) => entry.id === sale.productId);

  if (!product) {
    throw new Error(`Missing seeded product for sale ${sale.productId}`);
  }

  const unitPrice = sale.unitPrice ?? product.sellingPrice;

  return {
    ...sale,
    productName: product.name,
    category: product.category,
    unitPrice,
    totalAmount: sale.quantity * unitPrice,
  };
}

export function buildInventoryProducts(
  products: MerchantProduct[],
  orders: MerchantOrder[]
): InventoryProduct[] {
  return products.map((product) => {
    const onOrder = orders
      .filter(
        (order) => order.status !== "Draft" && isActiveOrder(order.status)
      )
      .flatMap((order) => order.items)
      .filter((item) => item.productId === product.id)
      .reduce((total, item) => total + item.quantity, 0);

    return {
      ...product,
      stockStatus: getStockStatus(product.stockOnHand, product.reorderPoint),
      onOrder,
    };
  });
}

export function normalizeMerchantState(
  rawState: Partial<MerchantState> | null | undefined
): MerchantState {
  const seededState = createSeedState();

  if (!rawState?.products?.length) {
    return seededState;
  }

  const seededProductsById = new Map(
    seededState.products.map((product) => [product.id, product])
  );

  const products = rawState.products.map((product) => {
    const seededProduct = seededProductsById.get(product.id);
    const sellingPrice =
      product.sellingPrice ??
      seededProduct?.sellingPrice ??
      estimateSellingPrice(product.unitPrice);

    return {
      id: product.id,
      sku:
        product.sku ??
        seededProduct?.sku ??
        `KIN-RTL-${product.id.slice(0, 6).toUpperCase()}`,
      name: product.name,
      category: product.category ?? seededProduct?.category ?? "General",
      supplier:
        product.supplier ??
        seededProduct?.supplier ??
        `${seededState.profile.neighborhood} Open Market Supply`,
      neighborhood:
        product.neighborhood ??
        seededProduct?.neighborhood ??
        seededState.profile.neighborhood,
      unitPrice:
        product.unitPrice ??
        seededProduct?.unitPrice ??
        estimateCostFromSellingPrice(sellingPrice),
      sellingPrice,
      packSize: product.packSize ?? seededProduct?.packSize ?? "1 unit",
      minOrder: product.minOrder ?? seededProduct?.minOrder ?? "1 unit",
      stockOnHand: product.stockOnHand ?? seededProduct?.stockOnHand ?? 0,
      reorderPoint: product.reorderPoint ?? seededProduct?.reorderPoint ?? 2,
      reorderQuantity:
        product.reorderQuantity ?? seededProduct?.reorderQuantity ?? 6,
      leadTimeDays: product.leadTimeDays ?? seededProduct?.leadTimeDays ?? 2,
      lastRestockedAt:
        product.lastRestockedAt ??
        seededProduct?.lastRestockedAt ??
        new Date().toISOString(),
    };
  });

  return {
    profile: {
      ...seededState.profile,
      ...rawState.profile,
    },
    products,
    orders:
      rawState.orders?.map((order) => ({
        ...order,
        sourceDetail: order.sourceDetail ?? getMerchantOrderSourceDetail(order),
      })) ?? seededState.orders,
    activities: rawState.activities ?? seededState.activities,
    sales: rawState.sales ?? seededState.sales,
  };
}

export function createEmptyMerchantState(
  profileOverrides?: Partial<MerchantProfile>
): MerchantState {
  return {
    profile: {
      ...DEFAULT_MERCHANT_PROFILE,
      ...profileOverrides,
    },
    products: [],
    orders: [],
    activities: [],
    sales: [],
  };
}

export function createSeedState(): MerchantState {
  const orderOneCreatedAt = "2026-04-09T06:20:00.000Z";
  const orderTwoCreatedAt = "2026-04-08T10:10:00.000Z";
  const orderThreeCreatedAt = "2026-04-06T13:45:00.000Z";
  const saleOneCreatedAt = "2026-04-09T07:15:00.000Z";
  const saleTwoCreatedAt = "2026-04-09T08:05:00.000Z";
  const saleThreeCreatedAt = "2026-04-09T09:20:00.000Z";
  const saleFourCreatedAt = "2026-04-08T17:10:00.000Z";

  const orders: MerchantOrder[] = [
    buildSeedOrder({
      id: "order-seed-10421",
      reference: "ZND-10421",
      supplierName: "Matete FMCG Center",
      status: "Pending",
      source: "Inventory",
      sourceDetail: "inventory-restock",
      createdAt: orderOneCreatedAt,
      orderDate: formatShortDate(orderOneCreatedAt),
      deliveryDate: formatShortDate(withDays(orderOneCreatedAt, 3)),
      deliveryAddress: "Avenue Kianza 18, Quartier 3, Masina, Kinshasa",
      notes: "Urgent restock for weekend foot traffic.",
      items: [
        { productId: "huile-selleta-5l", quantity: 4 },
        { productId: "savon-mama-48", quantity: 3 },
      ],
    }),
    buildSeedOrder({
      id: "order-seed-10420",
      reference: "ZND-10420",
      supplierName: "Bandal Beverage Hub",
      status: "In Transit",
      source: "Home",
      sourceDetail: "quick-reorder",
      createdAt: orderTwoCreatedAt,
      orderDate: formatShortDate(orderTwoCreatedAt),
      deliveryDate: formatShortDate(withDays(orderTwoCreatedAt, 2)),
      deliveryAddress: "Avenue Kianza 18, Quartier 3, Masina, Kinshasa",
      notes: "Restock ahead of Sunday neighborhood rush.",
      items: [
        { productId: "fanta-orange-24", quantity: 4 },
        { productId: "vitalo-water-30", quantity: 8 },
      ],
    }),
    buildSeedOrder({
      id: "order-seed-10418",
      reference: "ZND-10418",
      supplierName: "Marche Gambela Cash & Carry",
      status: "Delivered",
      source: "Orders",
      sourceDetail: "manual-new-order",
      createdAt: orderThreeCreatedAt,
      orderDate: formatShortDate(orderThreeCreatedAt),
      deliveryDate: formatShortDate(withDays(orderThreeCreatedAt, 2)),
      deliveryAddress: "Avenue Kianza 18, Quartier 3, Masina, Kinshasa",
      items: [
        { productId: "riz-bella-25kg", quantity: 6 },
        { productId: "tomate-tmt-48", quantity: 5 },
      ],
    }),
  ];

  const sales: MerchantSale[] = [
    buildSeedSale({
      id: "sale-seed-201",
      productId: "vitalo-water-30",
      quantity: 3,
      paymentMethod: "Cash",
      soldAt: saleOneCreatedAt,
      stockAfterSale: 5,
      triggeredLowStock: true,
    }),
    buildSeedSale({
      id: "sale-seed-202",
      productId: "sucre-kwilu-5kg",
      quantity: 2,
      paymentMethod: "Mobile Money",
      soldAt: saleTwoCreatedAt,
      stockAfterSale: 6,
      triggeredLowStock: true,
    }),
    buildSeedSale({
      id: "sale-seed-203",
      productId: "fanta-orange-24",
      quantity: 2,
      paymentMethod: "Cash",
      soldAt: saleThreeCreatedAt,
      stockAfterSale: 10,
      triggeredLowStock: false,
    }),
    buildSeedSale({
      id: "sale-seed-204",
      productId: "riz-bella-25kg",
      quantity: 1,
      paymentMethod: "Card",
      soldAt: saleFourCreatedAt,
      stockAfterSale: 14,
      triggeredLowStock: false,
    }),
  ];

  return {
    profile: DEFAULT_MERCHANT_PROFILE,
    products: SEEDED_PRODUCTS,
    orders,
    activities: [
      {
        id: "activity-sale-1",
        type: "sale",
        tone: "accent",
        title: "L'eau et le sucre sortent vite",
        detail:
          "Vitalo Water et Sucre Kwilu tournent vite ce matin a Masina.",
        createdAt: saleTwoCreatedAt,
      },
      {
        id: "activity-alert-1",
        type: "alert",
        tone: "warning",
        title: "Deux rayons sont a reapprovisionner",
        detail:
          "Coca-Cola 24 x 50cl et Sel Iode sont en rupture. Reappro a lancer avant le rush du soir.",
        createdAt: "2026-04-09T07:35:00.000Z",
      },
      {
        id: "activity-order-1",
        type: "order",
        tone: "success",
        title: "Commande envoyee au fournisseur",
        detail:
          "ZND-10421 chez Matete FMCG Center a ete envoyee pour Selleta Oil et Savon Mama. En attente de confirmation fournisseur.",
        createdAt: orderOneCreatedAt,
      },
      {
        id: "activity-delivery-1",
        type: "delivery",
        tone: "success",
        title: "Livraison recue de Gambela",
        detail:
          "ZND-10418 de Marche Gambela Cash & Carry a bien ete recue a Masina.",
        createdAt: "2026-04-08T16:25:00.000Z",
      },
      {
        id: "activity-order-2",
        type: "order",
        tone: "success",
        title: "Commande boisson en route",
        detail:
          "Bandal Beverage Hub a expedie ZND-10420. Livraison attendue aujourd'hui.",
        createdAt: "2026-04-08T12:10:00.000Z",
      },
    ],
    sales,
  };
}
