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
export type MerchantInventoryMovementReason =
  | "stock_initial"
  | "sale"
  | "order-received"
  | "manual-entry"
  | "inventory-correction"
  | "breakage-loss"
  | "manual-output";
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
  isActive: boolean;
  baseUnitName?: string;
  purchaseUnitName?: string;
  purchaseUnitSize?: number;
  saleUnitName?: string;
  saleUnitSize?: number;
  unitSchemaVersion?: number;
}

export interface MerchantOrderItem {
  productId: string;
  name: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  packSize: string;
  quantityBase?: number;
  displayUnitName?: string;
  unitSize?: number;
  baseUnitName?: string;
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
  quantityBase?: number;
  displayUnitName?: string;
  unitSize?: number;
}

export interface MerchantInventoryMovement {
  id: string;
  productId: string;
  productName: string;
  reason: MerchantInventoryMovementReason;
  quantityChange: number;
  stockAfter: number;
  note?: string;
  createdAt: string;
  displayQuantity?: number;
  displayUnitName?: string;
  unitSize?: number;
}

export interface MerchantState {
  profile: MerchantProfile;
  products: MerchantProduct[];
  orders: MerchantOrder[];
  activities: MerchantActivity[];
  sales: MerchantSale[];
  inventoryMovements: MerchantInventoryMovement[];
}

export interface InventoryProduct extends MerchantProduct {
  baseUnitName: string;
  purchaseUnitName: string;
  purchaseUnitSize: number;
  saleUnitName: string;
  saleUnitSize: number;
  stockStatus: MerchantStockStatus;
  onOrder: number;
}

export const MERCHANT_STATE_STORAGE_KEY = "zando_merchant_state_v2";
export const DEFAULT_MERCHANT_PROFILE: MerchantProfile = {
  storeName: "Mama Mireille Mini Market",
  neighborhood: "Masina",
  city: "Kinshasa",
};

const DEFAULT_MERCHANT_UNIT_NAME = "unit\u00e9";

function normalizeMerchantUnitName(unitName: string | null | undefined): string {
  return unitName?.trim() || DEFAULT_MERCHANT_UNIT_NAME;
}

function getMerchantUnitPlural(unitName: string, quantity: number): string {
  const normalizedUnitName = normalizeMerchantUnitName(unitName);

  if (quantity === 1 || normalizedUnitName.endsWith("s")) {
    return normalizedUnitName;
  }

  return `${normalizedUnitName}s`;
}

function inferMerchantUnitNameFromText(value: string | null | undefined): string {
  const normalizedValue = value?.trim().toLowerCase() ?? "";

  if (normalizedValue.includes("bouteille")) return "bouteille";
  if (normalizedValue.includes("casier")) return "casier";
  if (normalizedValue.includes("caisse")) return "caisse";
  if (normalizedValue.includes("carton")) return "carton";
  if (normalizedValue.includes("sac")) return "sac";
  if (normalizedValue.includes("bidon")) return "bidon";
  if (normalizedValue.includes("boite")) return "bo\u00eete";
  if (normalizedValue.includes("bo\u00eete")) return "bo\u00eete";
  if (normalizedValue.includes("barre")) return "barre";
  if (normalizedValue.includes("bottle")) return "bouteille";
  if (normalizedValue.includes("crate")) return "casier";
  if (normalizedValue.includes("case")) return "caisse";
  if (normalizedValue.includes("carton")) return "carton";
  if (normalizedValue.includes("pack")) return "pack";
  if (normalizedValue.includes("sack")) return "sac";
  if (normalizedValue.includes("bag")) return "sac";
  if (normalizedValue.includes("tin")) return "bo\u00eete";
  if (normalizedValue.includes("bar")) return "barre";

  return DEFAULT_MERCHANT_UNIT_NAME;
}

export function normalizeMerchantPackCountLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(
      /\s+\d+\s*(?:x|\u00d7)\s*([0-9]+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|l))\b/gi,
      " $1"
    )
    .replace(
      /\s+\d+\s*-\s*(?:bottle|bottles|tin|tins|pack|packs|bar|bars)\s+(?:carton|case|crate|pack|bale)\b/gi,
      ""
    )
    .replace(/\s+\d+\s*(?:x|\u00d7)\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeMerchantProductName(name: string): string {
  return normalizeMerchantPackCountLabel(name);
}

type MerchantUnitConfig = Required<
  Pick<
    MerchantProduct,
    | "baseUnitName"
    | "purchaseUnitName"
    | "purchaseUnitSize"
    | "saleUnitName"
    | "saleUnitSize"
  >
>;

function getPositiveUnitSize(value: number | null | undefined): number {
  return Math.max(1, Math.round(value ?? 1));
}

function parseMerchantPackSize(value: string | null | undefined): number {
  const normalizedValue = value?.trim().toLowerCase() ?? "";
  const match =
    normalizedValue.match(
      /(\d+)\s*(?:-|x|\u00d7)?\s*(?:bottle|bottles|bouteille|bouteilles|tin|tins|boite|boites|bo\u00eete|bo\u00eetes|pack|packs|bar|bars|barre|barres)\b/
    ) ??
    normalizedValue.match(
      /(?:de|of)\s+(\d+)\s+(?:bottle|bottles|bouteille|bouteilles|tin|tins|boite|boites|bo\u00eete|bo\u00eetes|pack|packs|bar|bars|barre|barres)\b/
    );

  if (!match?.[1]) {
    return 1;
  }

  const parsedSize = Number.parseInt(match[1], 10);
  return Number.isFinite(parsedSize) && parsedSize > 1 ? parsedSize : 1;
}

function parseMerchantQuantityPrefix(value: string | null | undefined): number {
  const match = value?.trim().match(/^(\d+)/);
  if (!match?.[1]) return 1;

  const parsedQuantity = Number.parseInt(match[1], 10);
  return Number.isFinite(parsedQuantity) && parsedQuantity > 0
    ? parsedQuantity
    : 1;
}

function inferMerchantBaseUnitNameFromPack(
  packSize: string | null | undefined
): string {
  const normalizedValue = packSize?.trim().toLowerCase() ?? "";

  if (
    normalizedValue.includes("bottle") ||
    normalizedValue.includes("bouteille")
  ) {
    return "bouteille";
  }

  if (
    normalizedValue.includes("tin") ||
    normalizedValue.includes("boite") ||
    normalizedValue.includes("bo\u00eete")
  ) {
    return "bo\u00eete";
  }

  if (normalizedValue.includes("bar") || normalizedValue.includes("barre")) {
    return "barre";
  }

  if (normalizedValue.includes("pack") || normalizedValue.includes("paquet")) {
    return "paquet";
  }

  return inferMerchantUnitNameFromText(packSize);
}

function inferMerchantPurchaseUnitNameFromPack(
  packSize: string | null | undefined,
  minOrder: string | null | undefined
): string {
  const combinedValue = `${packSize ?? ""} ${minOrder ?? ""}`.toLowerCase();

  if (combinedValue.includes("crate") || combinedValue.includes("casier")) {
    return "casier";
  }

  if (combinedValue.includes("case") || combinedValue.includes("caisse")) {
    return "caisse";
  }

  if (combinedValue.includes("carton")) {
    return "carton";
  }

  if (combinedValue.includes("bale") || combinedValue.includes("ballot")) {
    return "ballot";
  }

  if (combinedValue.includes("pack")) {
    return "pack";
  }

  if (combinedValue.includes("sack") || combinedValue.includes("bag")) {
    return "sac";
  }

  if (combinedValue.includes("jerrycan") || combinedValue.includes("bidon")) {
    return "bidon";
  }

  return inferMerchantUnitNameFromText(minOrder ?? packSize);
}

export function inferMerchantProductUnitConfig(
  product: Pick<MerchantProduct, "packSize" | "minOrder"> &
    Partial<Pick<MerchantProduct, "baseUnitName" | "purchaseUnitName" | "purchaseUnitSize" | "saleUnitName" | "saleUnitSize">>
): MerchantUnitConfig {
  const inferredPackSize = parseMerchantPackSize(product.packSize);
  const baseUnitName = normalizeMerchantUnitName(
    product.baseUnitName ??
      (inferredPackSize > 1
        ? inferMerchantBaseUnitNameFromPack(product.packSize)
        : inferMerchantUnitNameFromText(product.packSize))
  );
  const purchaseUnitName = normalizeMerchantUnitName(
    product.purchaseUnitName ??
      (inferredPackSize > 1
        ? inferMerchantPurchaseUnitNameFromPack(
            product.packSize,
            product.minOrder
          )
        : inferMerchantUnitNameFromText(product.minOrder ?? product.packSize))
  );
  const purchaseUnitSize = getPositiveUnitSize(
    product.purchaseUnitSize && product.purchaseUnitSize > 1
      ? product.purchaseUnitSize
      : inferredPackSize
  );
  const saleUnitName = normalizeMerchantUnitName(
    product.saleUnitName ?? baseUnitName
  );
  const saleUnitSize = getPositiveUnitSize(product.saleUnitSize);

  return {
    baseUnitName,
    purchaseUnitName,
    purchaseUnitSize,
    saleUnitName,
    saleUnitSize,
  };
}

export function normalizeMerchantProductUnits(
  product: MerchantProduct
): MerchantProduct & MerchantUnitConfig {
  const unitConfig = inferMerchantProductUnitConfig(product);

  return {
    ...product,
    name: normalizeMerchantProductName(product.name),
    ...unitConfig,
    unitSchemaVersion: product.unitSchemaVersion ?? 1,
  };
}

export function convertMerchantPurchaseQuantityToBase(
  quantity: number,
  product: Pick<MerchantProduct, "packSize" | "minOrder"> &
    Partial<Pick<MerchantProduct, "purchaseUnitSize">>
): number {
  return Math.round(quantity) * inferMerchantProductUnitConfig(product).purchaseUnitSize;
}

export function convertMerchantSaleQuantityToBase(
  quantity: number,
  product: Pick<MerchantProduct, "packSize" | "minOrder"> &
    Partial<Pick<MerchantProduct, "saleUnitSize">>
): number {
  return Math.round(quantity) * inferMerchantProductUnitConfig(product).saleUnitSize;
}

export function getMerchantOrderItemBaseQuantity(
  item: Pick<MerchantOrderItem, "quantity" | "packSize"> &
    Partial<
      Pick<
        MerchantOrderItem,
        "quantityBase" | "unitSize" | "displayUnitName" | "baseUnitName"
      >
    >
): number {
  const unitSize = getPositiveUnitSize(
    item.unitSize ?? inferMerchantProductUnitConfig({
      packSize: item.packSize,
      minOrder: item.packSize,
    }).purchaseUnitSize
  );

  return item.quantityBase ?? Math.round(item.quantity) * unitSize;
}

export function formatMerchantUnitQuantity(
  quantity: number,
  unitName: string
): string {
  return `${quantity} ${getMerchantUnitPlural(unitName, quantity)}`;
}

export function formatMerchantBaseQuantity(
  quantityBase: number,
  config: { baseUnitName?: string | null }
): string {
  return formatMerchantUnitQuantity(
    quantityBase,
    normalizeMerchantUnitName(config.baseUnitName)
  );
}

export function formatMerchantPurchaseEquivalentStock(
  quantityBase: number,
  config: {
    baseUnitName?: string | null;
    purchaseUnitName?: string | null;
    purchaseUnitSize?: number | null;
  }
): string {
  const baseUnitName = normalizeMerchantUnitName(config.baseUnitName);
  const purchaseUnitName = normalizeMerchantUnitName(config.purchaseUnitName);
  const purchaseUnitSize = Math.max(1, Math.round(config.purchaseUnitSize ?? 1));

  if (purchaseUnitSize <= 1) {
    return formatMerchantUnitQuantity(quantityBase, baseUnitName);
  }

  const purchaseUnits = Math.floor(quantityBase / purchaseUnitSize);
  const remainderBaseUnits = quantityBase % purchaseUnitSize;

  if (purchaseUnits === 0) {
    return formatMerchantUnitQuantity(quantityBase, baseUnitName);
  }

  const purchaseLabel = formatMerchantUnitQuantity(
    purchaseUnits,
    purchaseUnitName
  );

  if (remainderBaseUnits === 0) {
    return purchaseLabel;
  }

  return `${purchaseLabel} + ${formatMerchantUnitQuantity(
    remainderBaseUnits,
    baseUnitName
  )}`;
}

export function formatMerchantPurchaseUnitDefinition(config: {
  baseUnitName?: string | null;
  purchaseUnitName?: string | null;
  purchaseUnitSize?: number | null;
}): string {
  const purchaseUnitSize = getPositiveUnitSize(config.purchaseUnitSize);
  const purchaseUnitName = normalizeMerchantUnitName(config.purchaseUnitName);
  const baseUnitName = normalizeMerchantUnitName(config.baseUnitName);

  if (purchaseUnitSize <= 1 || purchaseUnitName === baseUnitName) {
    return purchaseUnitName;
  }

  return `1 ${purchaseUnitName} = ${formatMerchantUnitQuantity(
    purchaseUnitSize,
    baseUnitName
  )}`;
}

export function formatMerchantMinimumPurchaseQuantity(
  minOrder: string,
  config: {
    purchaseUnitName?: string | null;
  }
): string {
  return formatMerchantUnitQuantity(
    parseMerchantQuantityPrefix(minOrder),
    normalizeMerchantUnitName(config.purchaseUnitName)
  );
}

export function formatMerchantOrderItemQuantity(
  item: Pick<MerchantOrderItem, "quantity" | "packSize"> & {
    quantityBase?: number;
    displayUnitName?: string;
    baseUnitName?: string;
    unitSize?: number;
  }
): string {
  const inferredConfig = inferMerchantProductUnitConfig({
    packSize: item.packSize,
    minOrder: item.packSize,
  });
  const unitSize = Math.max(
    1,
    Math.round(item.unitSize ?? inferredConfig.purchaseUnitSize)
  );
  const displayUnitName = normalizeMerchantUnitName(
    item.displayUnitName ?? inferredConfig.purchaseUnitName
  );
  const baseUnitName = normalizeMerchantUnitName(
    item.baseUnitName ?? inferredConfig.baseUnitName
  );
  const quantityBase = item.quantityBase ?? item.quantity * unitSize;
  const displayLabel = formatMerchantUnitQuantity(item.quantity, displayUnitName);

  if (unitSize <= 1) {
    return displayLabel;
  }

  return `${displayLabel} (${formatMerchantUnitQuantity(
    quantityBase,
    baseUnitName
  )})`;
}

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
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

  if (sourceDetail === "quick-reorder") return "Réappro rapide";
  if (sourceDetail === "low-stock-reorder") return "Réappro rapide";
  if (sourceDetail === "inventory-restock") return "Réappro stock";
  if (sourceDetail === "saved-basket-reload") return "Panier relancé";
  return "Commande manuelle";
}

export function getMerchantOrderStatusLabel(
  status: MerchantOrderStatus
): string {
  if (status === "Draft") return "Brouillon";
  if (status === "Pending") return "En attente fournisseur";
  if (status === "Confirmed") return "En route";
  if (status === "Packed") return "En route";
  if (status === "In Transit") return "En route";
  if (status === "Delivered") return "Réceptionnée";
  return "Annulée";
}

export function getDeliveryTrackingStatusLabel(
  status: DeliveryTrackingStatus
): string {
  if (status === "Pending") return "En attente fournisseur";
  if (status === "In Transit") return "En route";
  return "Réceptionnée";
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
    return "Ce brouillon est enregistré, encore modifiable et pas encore envoyé au fournisseur.";
  }

  if (status === "Pending") {
    return "Cette commande est déjà envoyée et attend encore la confirmation du fournisseur.";
  }

  if (status === "Confirmed") {
    return "Le fournisseur a confirmé cette commande.";
  }

  if (status === "Packed") {
    return "Le fournisseur prépare cette commande avant l'expédition.";
  }

  if (status === "In Transit") {
    return "Cette commande est en route vers la boutique.";
  }

  if (status === "Delivered") {
    return "Cette commande a déjà été réceptionnée à la boutique.";
  }

  return "Cette commande a été annulée avant la réception.";
}

export function getMerchantPaymentMethodLabel(
  method: MerchantSalePaymentMethod
): string {
  if (method === "Cash") return "Espèces";
  if (method === "Mobile Money") return "Mobile Money";
  return "Carte";
}

export function getMerchantInventoryMovementReasonLabel(
  reason: MerchantInventoryMovementReason
): string {
  if (reason === "stock_initial") return "Stock initial";
  if (reason === "sale") return "Vente";
  if (reason === "order-received") return "Commande reçue";
  if (reason === "manual-entry") return "Entrée manuelle";
  if (reason === "inventory-correction") return "Correction inventaire";
  if (reason === "breakage-loss") return "Casse / perte";
  return "Sortie manuelle";
}

export function getMerchantCategoryLabel(category: string): string {
  if (category === "All") return "Toutes";
  if (category === "Beverages") return "Boissons";
  if (category === "Home Care") return "Entretien";
  if (category === "Pantry") return "Épicerie";
  if (category === "Staples") return "Produits de base";
  if (category === "General") return "Divers";
  return category;
}

export function getMerchantOrderTotalUnits(order: Pick<MerchantOrder, "items">): number {
  return order.items.reduce(
    (runningTotal, item) => runningTotal + getMerchantOrderItemBaseQuantity(item),
    0
  );
}

export function getMerchantOrderItemPreview(
  order: Pick<MerchantOrder, "items">,
  limit = 3
): string[] {
  return order.items
    .slice(0, limit)
    .map((item) => `${item.name} - ${formatMerchantOrderItemQuantity(item)}`);
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
    return "Réception";
  }

  if (activity.type === "order" && activity.tone === "success") {
    return "Commande envoyée";
  }

  if (activity.type === "order" && activity.tone === "warning") {
    return "À confirmer";
  }

  if (activity.type === "alert") {
    return "À traiter";
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
    return `Il y a ${diffMinutes} min`;
  }

  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Il y a ${diffDays} j`;
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

type SeededProductInput = Omit<
  MerchantProduct,
  | "baseUnitName"
  | "purchaseUnitName"
  | "purchaseUnitSize"
  | "saleUnitName"
  | "saleUnitSize"
  | "unitSchemaVersion"
>;

function buildSeedProduct(input: SeededProductInput): MerchantProduct {
  const unitConfig = inferMerchantProductUnitConfig(input);
  const shouldConvertPackValues = unitConfig.purchaseUnitSize > 1;

  return {
    ...input,
    name: normalizeMerchantProductName(input.name),
    sellingPrice: shouldConvertPackValues
      ? Math.max(1, Math.round(input.sellingPrice / unitConfig.purchaseUnitSize))
      : input.sellingPrice,
    stockOnHand: shouldConvertPackValues
      ? input.stockOnHand * unitConfig.purchaseUnitSize
      : input.stockOnHand,
    reorderPoint: shouldConvertPackValues
      ? input.reorderPoint * unitConfig.purchaseUnitSize
      : input.reorderPoint,
    ...unitConfig,
    unitSchemaVersion: 1,
  };
}

const SEEDED_PRODUCT_INPUTS: SeededProductInput[] = [
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
  },
  {
    id: "tomate-tmt-48",
    sku: "KIN-PAN-034",
    name: "TMT Tomato Paste 70g",
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
    isActive: true,
  },
  {
    id: "sel-io-25",
    sku: "KIN-PAN-041",
    name: "Sel Iode 500g",
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
    isActive: true,
  },
  {
    id: "fanta-orange-24",
    sku: "KIN-BEV-005",
    name: "Fanta Orange 50cl",
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
    isActive: true,
  },
  {
    id: "coca-cola-24",
    sku: "KIN-BEV-002",
    name: "Coca-Cola 50cl",
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
    isActive: true,
  },
  {
    id: "primus-12",
    sku: "KIN-BEV-019",
    name: "Primus 72cl",
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
    isActive: true,
  },
  {
    id: "vitalo-water-30",
    sku: "KIN-BEV-027",
    name: "Vitalo Water 500ml",
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
    isActive: true,
  },
  {
    id: "omo-powder-24",
    sku: "KIN-HOM-012",
    name: "Omo Powder 900g",
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
    isActive: true,
  },
  {
    id: "savon-mama-48",
    sku: "KIN-HOM-016",
    name: "Savon Mama",
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
    isActive: true,
  },
];

const SEEDED_PRODUCTS: MerchantProduct[] = SEEDED_PRODUCT_INPUTS.map(
  buildSeedProduct
);

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
    name: normalizeMerchantProductName(product.name),
    supplier: product.supplier,
    quantity,
    unitPrice: product.unitPrice,
    packSize: product.packSize,
    quantityBase: convertMerchantPurchaseQuantityToBase(quantity, product),
    displayUnitName: product.purchaseUnitName,
    unitSize: product.purchaseUnitSize,
    baseUnitName: product.baseUnitName,
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
  const stockAfterSale =
    product.purchaseUnitSize && product.purchaseUnitSize > 1
      ? sale.stockAfterSale * product.purchaseUnitSize
      : sale.stockAfterSale;

  return {
    ...sale,
    productName: normalizeMerchantProductName(product.name),
    category: product.category,
    stockAfterSale,
    unitPrice,
    totalAmount: sale.quantity * unitPrice,
    quantityBase: convertMerchantSaleQuantityToBase(sale.quantity, product),
    displayUnitName: product.saleUnitName,
    unitSize: product.saleUnitSize,
  };
}

function getSeedProduct(productId: string): MerchantProduct {
  const product = SEEDED_PRODUCTS.find((entry) => entry.id === productId);

  if (!product) {
    throw new Error(`Missing seeded product for ${productId}`);
  }

  return product;
}

function convertSeedLegacyStockQuantity(productId: string, quantity: number): number {
  const product = getSeedProduct(productId);
  return product.purchaseUnitSize && product.purchaseUnitSize > 1
    ? quantity * product.purchaseUnitSize
    : quantity;
}

export function buildInventoryProducts(
  products: MerchantProduct[],
  orders: MerchantOrder[]
): InventoryProduct[] {
  return products.map((product) => {
    const normalizedProduct = normalizeMerchantProductUnits(product);
    const onOrder = orders
      .filter(
        (order) => order.status !== "Draft" && isActiveOrder(order.status)
      )
      .flatMap((order) => order.items)
      .filter((item) => item.productId === product.id)
      .reduce((total, item) => total + getMerchantOrderItemBaseQuantity(item), 0);

    return {
      ...normalizedProduct,
      stockStatus: getStockStatus(
        normalizedProduct.stockOnHand,
        normalizedProduct.reorderPoint
      ),
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

    return normalizeMerchantProductUnits({
      id: product.id,
      sku:
        product.sku ??
        seededProduct?.sku ??
        `KIN-RTL-${product.id.slice(0, 6).toUpperCase()}`,
      name: normalizeMerchantProductName(product.name),
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
      isActive: product.isActive ?? seededProduct?.isActive ?? true,
      baseUnitName: product.baseUnitName ?? seededProduct?.baseUnitName,
      purchaseUnitName:
        product.purchaseUnitName ?? seededProduct?.purchaseUnitName,
      purchaseUnitSize:
        product.purchaseUnitSize ?? seededProduct?.purchaseUnitSize,
      saleUnitName: product.saleUnitName ?? seededProduct?.saleUnitName,
      saleUnitSize: product.saleUnitSize ?? seededProduct?.saleUnitSize,
      unitSchemaVersion:
        product.unitSchemaVersion ?? seededProduct?.unitSchemaVersion ?? 1,
    });
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
        items: order.items.map((item) => ({
          ...item,
          name: normalizeMerchantProductName(item.name),
        })),
        sourceDetail: order.sourceDetail ?? getMerchantOrderSourceDetail(order),
      })) ?? seededState.orders,
    activities:
      rawState.activities?.map((activity) => ({
        ...activity,
        detail: normalizeMerchantPackCountLabel(activity.detail),
      })) ?? seededState.activities,
    sales:
      rawState.sales?.map((sale) => ({
        ...sale,
        productName: normalizeMerchantProductName(sale.productName),
      })) ?? seededState.sales,
    inventoryMovements:
      rawState.inventoryMovements?.map((movement) => ({
        ...movement,
        productName: normalizeMerchantProductName(movement.productName),
      })) ?? seededState.inventoryMovements,
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
    inventoryMovements: [],
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

  const inventoryMovements: MerchantInventoryMovement[] = [
    {
      id: "movement-seed-order-10418-riz",
      productId: "riz-bella-25kg",
      productName: "Riz Bella 25kg",
      reason: "order-received",
      quantityChange: 6,
      stockAfter: 15,
      createdAt: "2026-04-08T16:25:00.000Z",
      note: "Commande reçue de Marché Gambela Cash & Carry.",
    },
    {
      id: "movement-seed-order-10418-tomate",
      productId: "tomate-tmt-48",
      productName: "TMT Tomato Paste 70g",
      reason: "order-received",
      quantityChange: 5,
      stockAfter: 12,
      createdAt: "2026-04-08T16:25:00.000Z",
      note: "Commande reçue de Marché Gambela Cash & Carry.",
    },
    {
      id: "movement-seed-sale-201",
      productId: "vitalo-water-30",
      productName: "Vitalo Water 500ml",
      reason: "sale",
      quantityChange: -3,
      stockAfter: 5,
      createdAt: saleOneCreatedAt,
    },
    {
      id: "movement-seed-sale-202",
      productId: "sucre-kwilu-5kg",
      productName: "Sucre Kwilu 5kg",
      reason: "sale",
      quantityChange: -2,
      stockAfter: 6,
      createdAt: saleTwoCreatedAt,
    },
    {
      id: "movement-seed-sale-203",
      productId: "fanta-orange-24",
      productName: "Fanta Orange 50cl",
      reason: "sale",
      quantityChange: -2,
      stockAfter: 10,
      createdAt: saleThreeCreatedAt,
    },
    {
      id: "movement-seed-sale-204",
      productId: "riz-bella-25kg",
      productName: "Riz Bella 25kg",
      reason: "sale",
      quantityChange: -1,
      stockAfter: 14,
      createdAt: saleFourCreatedAt,
    },
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
        title: "Deux rayons sont à réapprovisionner",
        detail:
          "Coca-Cola 50cl et Sel Iodé 500g sont en rupture. Réappro à lancer avant le rush du soir.",
        createdAt: "2026-04-09T07:35:00.000Z",
      },
      {
        id: "activity-order-1",
        type: "order",
        tone: "success",
        title: "Commande envoyée au fournisseur",
        detail:
          "ZND-10421 chez Matete FMCG Center a été envoyée pour Selleta Oil et Savon Mama. En attente de confirmation fournisseur.",
        createdAt: orderOneCreatedAt,
      },
      {
        id: "activity-delivery-1",
        type: "delivery",
        tone: "success",
        title: "Livraison reçue de Gambela",
        detail:
          "ZND-10418 de Marché Gambela Cash & Carry a bien été reçue à Masina.",
        createdAt: "2026-04-08T16:25:00.000Z",
      },
      {
        id: "activity-order-2",
        type: "order",
        tone: "success",
        title: "Commande boisson en route",
        detail:
          "Bandal Beverage Hub a expédié ZND-10420. Livraison attendue aujourd'hui.",
        createdAt: "2026-04-08T12:10:00.000Z",
      },
    ],
    sales,
    inventoryMovements,
  };
}
