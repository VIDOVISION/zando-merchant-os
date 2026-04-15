import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSeedState,
  createEmptyMerchantState,
  formatShortDate,
  getMerchantOrderSourceDetail,
  getSeedInventoryProducts,
  type MerchantActivity,
  type MerchantOrder,
  type MerchantOrderItem,
  type MerchantOrderSourceDetail,
  type MerchantOrderStatus,
  type MerchantProduct,
  type MerchantProfile,
  type MerchantSale,
  type MerchantSalePaymentMethod,
  type MerchantState,
} from "@/lib/merchant-data";

type MerchantSupabaseClient = SupabaseClient<any, "public", any>;

export interface InventoryItemRow {
  id: string;
  merchant_id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  neighborhood: string;
  unit_price: number;
  selling_price: number;
  pack_size: string;
  min_order: string;
  stock_on_hand: number;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  last_restocked_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierOrderRow {
  id: string;
  merchant_id: string;
  reference: string;
  supplier_name: string;
  status: MerchantOrderStatus;
  source: MerchantOrder["source"];
  source_detail: MerchantOrderSourceDetail;
  delivery_address: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
  eta_at: string | null;
  updated_at?: string;
}

export interface SupplierOrderItemRow {
  id: string;
  merchant_id: string;
  supplier_order_id: string;
  product_id: string;
  name: string;
  supplier: string;
  quantity: number;
  unit_price: number;
  pack_size: string;
  created_at?: string;
}

export interface SaleRow {
  id: string;
  merchant_id: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: MerchantSalePaymentMethod;
  sold_at: string;
  stock_after_sale: number;
  triggered_low_stock: boolean;
  quick_added_product: boolean;
  created_at?: string;
}

export interface DeliveryUpdateRow {
  id: string;
  merchant_id: string;
  supplier_order_id: string;
  status: MerchantOrderStatus;
  note: string | null;
  created_at: string;
}

export interface ActivityFeedRow {
  id: string;
  merchant_id: string;
  type: MerchantActivity["type"];
  tone: MerchantActivity["tone"];
  title: string;
  detail: string;
  created_at: string;
}

interface SeedBackfillPayload {
  orders: SupplierOrderRow[];
  orderItems: SupplierOrderItemRow[];
  sales: SaleRow[];
  activities: ActivityFeedRow[];
  deliveryUpdates: DeliveryUpdateRow[];
}

export function deriveMerchantProfile(
  metadata?: Record<string, unknown> | null
): MerchantProfile {
  const storeName =
    getStringMetadata(metadata, [
      "storeName",
      "store_name",
      "businessName",
      "business_name",
      "shopName",
      "shop_name",
    ]) ?? "Mama Mireille Mini Market";
  const neighborhood =
    getStringMetadata(metadata, ["neighborhood", "area", "district"]) ?? "Masina";
  const city = getStringMetadata(metadata, ["city"]) ?? "Kinshasa";

  return {
    storeName,
    neighborhood,
    city,
  };
}

function getStringMetadata(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function buildMerchantScopedId(merchantId: string, seedId: string): string {
  return `${merchantId}:${seedId}`;
}

function buildSeedInventoryRows(
  merchantId: string,
  profile: MerchantProfile
): InventoryItemRow[] {
  return getSeedInventoryProducts().map((product) => ({
    id: buildMerchantScopedId(merchantId, product.id),
    merchant_id: merchantId,
    sku: product.sku,
    name: product.name,
    category: product.category,
    supplier: product.supplier,
    neighborhood: product.neighborhood || profile.neighborhood,
    unit_price: product.unitPrice,
    selling_price: product.sellingPrice,
    pack_size: product.packSize,
    min_order: product.minOrder,
    stock_on_hand: product.stockOnHand,
    reorder_point: product.reorderPoint,
    reorder_quantity: product.reorderQuantity,
    lead_time_days: product.leadTimeDays,
    last_restocked_at: product.lastRestockedAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

async function ensureSeedInventoryRows(
  supabase: MerchantSupabaseClient,
  merchantId: string,
  profile: MerchantProfile
): Promise<InventoryItemRow[]> {
  let inventoryRows = await fetchInventoryRows(supabase, merchantId);
  const seededRows = buildSeedInventoryRows(merchantId, profile);

  if (inventoryRows.length === 0) {
    const { data, error } = await supabase
      .from("inventory_items")
      .insert(seededRows)
      .select(
        "id, merchant_id, sku, name, category, supplier, neighborhood, unit_price, selling_price, pack_size, min_order, stock_on_hand, reorder_point, reorder_quantity, lead_time_days, last_restocked_at, created_at, updated_at"
      );

    if (error) {
      throw new Error(`Unable to seed merchant inventory: ${error.message}`);
    }

    return (data as InventoryItemRow[] | null) ?? seededRows;
  }

  const existingSkus = new Set(inventoryRows.map((row) => row.sku));
  const missingSeedRows = seededRows.filter((row) => !existingSkus.has(row.sku));

  if (missingSeedRows.length === 0) {
    return inventoryRows;
  }

  const { error } = await supabase.from("inventory_items").insert(missingSeedRows);

  if (error) {
    throw new Error(`Unable to backfill seeded inventory: ${error.message}`);
  }

  inventoryRows = await fetchInventoryRows(supabase, merchantId);
  return inventoryRows;
}

function buildSeedProductIdMap(
  inventoryRows: InventoryItemRow[]
): Map<string, string> {
  const seededProducts = getSeedInventoryProducts();
  const inventoryBySku = new Map(
    inventoryRows.map((row) => [row.sku, row.id] as const)
  );

  return seededProducts.reduce((collection, product) => {
    const persistedId = inventoryBySku.get(product.sku);
    if (persistedId) {
      collection.set(product.id, persistedId);
    }
    return collection;
  }, new Map<string, string>());
}

function toScopedSeedId(merchantId: string, seedId: string): string {
  return buildMerchantScopedId(merchantId, seedId);
}

function buildSeedBackfillPayload(
  merchantId: string,
  inventoryRows: InventoryItemRow[]
): SeedBackfillPayload {
  const seededState = createSeedState();
  const productIdMap = buildSeedProductIdMap(inventoryRows);
  const orders = seededState.orders.map((order) => {
    const etaAt = buildSeedEtaAt(order);
    return toSupplierOrderRow(
      merchantId,
      {
        ...order,
        id: toScopedSeedId(merchantId, order.id),
        items: order.items.map((item) => ({
          ...item,
          productId: productIdMap.get(item.productId) ?? item.productId,
        })),
      },
      etaAt
    );
  });

  const orderItems = seededState.orders.flatMap((order) =>
    toSupplierOrderItemRows(
      merchantId,
      toScopedSeedId(merchantId, order.id),
      order.items.map((item) => ({
        ...item,
        productId: productIdMap.get(item.productId) ?? item.productId,
      }))
    )
  );

  const sales = seededState.sales.map((sale) =>
    toSaleRow(merchantId, {
      ...sale,
      id: toScopedSeedId(merchantId, sale.id),
      productId: productIdMap.get(sale.productId) ?? sale.productId,
    })
  );

  const activities = seededState.activities.map((activity) =>
    toActivityFeedRow(merchantId, {
      ...activity,
      id: toScopedSeedId(merchantId, activity.id),
    })
  );

  const deliveryUpdates = seededState.orders
    .filter((order) => order.status !== "Draft" && order.status !== "Cancelled")
    .map((order) => ({
      id: `${toScopedSeedId(merchantId, order.id)}:delivery-seed`,
      merchant_id: merchantId,
      supplier_order_id: toScopedSeedId(merchantId, order.id),
      status: order.status,
      note: `Baseline seeded delivery state for ${order.reference}`,
      created_at: order.createdAt,
    }));

  return {
    orders,
    orderItems,
    sales,
    activities,
    deliveryUpdates,
  };
}

function buildSeedEtaAt(order: MerchantOrder): string | null {
  const createdAt = new Date(order.createdAt);
  const [day, monthLabel] = order.deliveryDate.split(" ");
  const monthMap = new Map([
    ["Jan", 0],
    ["Feb", 1],
    ["Mar", 2],
    ["Apr", 3],
    ["May", 4],
    ["Jun", 5],
    ["Jul", 6],
    ["Aug", 7],
    ["Sep", 8],
    ["Oct", 9],
    ["Nov", 10],
    ["Dec", 11],
  ]);
  const monthIndex = monthMap.get(monthLabel ?? "");
  const dayNumber = Number.parseInt(day ?? "", 10);

  if (monthIndex == null || Number.isNaN(dayNumber)) {
    return null;
  }

  return new Date(
    Date.UTC(createdAt.getUTCFullYear(), monthIndex, dayNumber, 12, 0, 0)
  ).toISOString();
}

async function maybeBackfillSeedMerchantData(
  supabase: MerchantSupabaseClient,
  merchantId: string,
  inventoryRows: InventoryItemRow[],
  existingData: {
    orderRows: SupplierOrderRow[];
    orderItemRows: SupplierOrderItemRow[];
    saleRows: SaleRow[];
    activityRows: ActivityFeedRow[];
    deliveryUpdateRows: DeliveryUpdateRow[];
  }
): Promise<boolean> {
  const payload = buildSeedBackfillPayload(merchantId, inventoryRows);
  const existingOrderIds = new Set(existingData.orderRows.map((row) => row.id));
  const existingOrderItemIds = new Set(
    existingData.orderItemRows.map((row) => row.id)
  );
  const existingSaleIds = new Set(existingData.saleRows.map((row) => row.id));
  const existingActivityIds = new Set(existingData.activityRows.map((row) => row.id));
  const existingDeliveryUpdateIds = new Set(
    existingData.deliveryUpdateRows.map((row) => row.id)
  );

  const missingOrders = payload.orders.filter((row) => !existingOrderIds.has(row.id));
  const missingOrderItems = payload.orderItems.filter(
    (row) => !existingOrderItemIds.has(row.id)
  );
  const missingSales = payload.sales.filter((row) => !existingSaleIds.has(row.id));
  const missingActivities = payload.activities.filter(
    (row) => !existingActivityIds.has(row.id)
  );
  const missingDeliveryUpdates = payload.deliveryUpdates.filter(
    (row) => !existingDeliveryUpdateIds.has(row.id)
  );

  if (
    missingOrders.length === 0 &&
    missingSales.length === 0 &&
    missingActivities.length === 0 &&
    missingDeliveryUpdates.length === 0
  ) {
    return false;
  }

  if (missingOrders.length > 0) {
    const { error } = await supabase.from("supplier_orders").insert(missingOrders);
    if (error) {
      throw new Error(`Unable to backfill seeded supplier orders: ${error.message}`);
    }
  }

  if (missingOrderItems.length > 0) {
    const { error } = await supabase
      .from("supplier_order_items")
      .insert(missingOrderItems);
    if (error) {
      throw new Error(
        `Unable to backfill seeded supplier order items: ${error.message}`
      );
    }
  }

  if (missingSales.length > 0) {
    const { error } = await supabase.from("sales").insert(missingSales);
    if (error) {
      throw new Error(`Unable to backfill seeded sales: ${error.message}`);
    }
  }

  if (missingActivities.length > 0) {
    const { error } = await supabase.from("activity_feed").insert(missingActivities);
    if (error) {
      throw new Error(`Unable to backfill seeded activity: ${error.message}`);
    }
  }

  if (missingDeliveryUpdates.length > 0) {
    const { error } = await supabase
      .from("delivery_updates")
      .insert(missingDeliveryUpdates);
    if (error) {
      throw new Error(
        `Unable to backfill seeded delivery updates: ${error.message}`
      );
    }
  }

  return true;
}

export async function loadMerchantState(
  supabase: MerchantSupabaseClient,
  input: {
    merchantId: string;
    profile: MerchantProfile;
  }
): Promise<MerchantState> {
  const { merchantId, profile } = input;
  const inventoryRows = await ensureSeedInventoryRows(supabase, merchantId, profile);

  let [
    orderRowsResult,
    orderItemRowsResult,
    saleRowsResult,
    activityRowsResult,
    deliveryUpdateRowsResult,
  ] = await Promise.all([
    supabase
      .from("supplier_orders")
      .select(
        "id, merchant_id, reference, supplier_name, status, source, source_detail, delivery_address, notes, total_amount, created_at, eta_at, updated_at"
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("supplier_order_items")
      .select(
        "id, merchant_id, supplier_order_id, product_id, name, supplier, quantity, unit_price, pack_size, created_at"
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("sales")
      .select(
        "id, merchant_id, product_id, product_name, category, quantity, unit_price, total_amount, payment_method, sold_at, stock_after_sale, triggered_low_stock, quick_added_product, created_at"
      )
      .eq("merchant_id", merchantId)
      .order("sold_at", { ascending: false }),
    supabase
      .from("activity_feed")
      .select("id, merchant_id, type, tone, title, detail, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("delivery_updates")
      .select("id, merchant_id, supplier_order_id, status, note, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false }),
  ]);

  if (orderRowsResult.error) {
    throw new Error(`Unable to load supplier orders: ${orderRowsResult.error.message}`);
  }

  if (orderItemRowsResult.error) {
    throw new Error(
      `Unable to load supplier order items: ${orderItemRowsResult.error.message}`
    );
  }

  if (saleRowsResult.error) {
    throw new Error(`Unable to load sales: ${saleRowsResult.error.message}`);
  }

  if (activityRowsResult.error) {
    throw new Error(
      `Unable to load merchant activity feed: ${activityRowsResult.error.message}`
    );
  }

  if (deliveryUpdateRowsResult.error) {
    throw new Error(
      `Unable to load merchant delivery updates: ${deliveryUpdateRowsResult.error.message}`
    );
  }

  const backfilledSeedData = await maybeBackfillSeedMerchantData(
    supabase,
    merchantId,
    inventoryRows,
    {
      orderRows: (orderRowsResult.data as SupplierOrderRow[] | null) ?? [],
      orderItemRows:
        (orderItemRowsResult.data as SupplierOrderItemRow[] | null) ?? [],
      saleRows: (saleRowsResult.data as SaleRow[] | null) ?? [],
      activityRows: (activityRowsResult.data as ActivityFeedRow[] | null) ?? [],
      deliveryUpdateRows:
        (deliveryUpdateRowsResult.data as DeliveryUpdateRow[] | null) ?? [],
    }
  );

  if (backfilledSeedData) {
    [
      orderRowsResult,
      orderItemRowsResult,
      saleRowsResult,
      activityRowsResult,
      deliveryUpdateRowsResult,
    ] = await Promise.all([
      supabase
        .from("supplier_orders")
        .select(
          "id, merchant_id, reference, supplier_name, status, source, source_detail, delivery_address, notes, total_amount, created_at, eta_at, updated_at"
        )
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("supplier_order_items")
        .select(
          "id, merchant_id, supplier_order_id, product_id, name, supplier, quantity, unit_price, pack_size, created_at"
        )
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: true }),
      supabase
        .from("sales")
        .select(
          "id, merchant_id, product_id, product_name, category, quantity, unit_price, total_amount, payment_method, sold_at, stock_after_sale, triggered_low_stock, quick_added_product, created_at"
        )
        .eq("merchant_id", merchantId)
        .order("sold_at", { ascending: false }),
      supabase
        .from("activity_feed")
        .select("id, merchant_id, type, tone, title, detail, created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("delivery_updates")
        .select("id, merchant_id, supplier_order_id, status, note, created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false }),
    ]);

    if (orderRowsResult.error) {
      throw new Error(
        `Unable to reload supplier orders after seed backfill: ${orderRowsResult.error.message}`
      );
    }

    if (orderItemRowsResult.error) {
      throw new Error(
        `Unable to reload supplier order items after seed backfill: ${orderItemRowsResult.error.message}`
      );
    }

    if (saleRowsResult.error) {
      throw new Error(
        `Unable to reload sales after seed backfill: ${saleRowsResult.error.message}`
      );
    }

    if (activityRowsResult.error) {
      throw new Error(
        `Unable to reload activity after seed backfill: ${activityRowsResult.error.message}`
      );
    }
  }

  return {
    ...createEmptyMerchantState(profile),
    products: inventoryRows.map(mapInventoryItemRowToProduct),
    orders: mapSupplierOrderRowsToOrders(
      (orderRowsResult.data as SupplierOrderRow[] | null) ?? [],
      (orderItemRowsResult.data as SupplierOrderItemRow[] | null) ?? []
    ),
    sales: ((saleRowsResult.data as SaleRow[] | null) ?? []).map(mapSaleRowToSale),
    activities: ((activityRowsResult.data as ActivityFeedRow[] | null) ?? []).map(
      mapActivityRowToActivity
    ),
  };
}

async function fetchInventoryRows(
  supabase: MerchantSupabaseClient,
  merchantId: string
): Promise<InventoryItemRow[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "id, merchant_id, sku, name, category, supplier, neighborhood, unit_price, selling_price, pack_size, min_order, stock_on_hand, reorder_point, reorder_quantity, lead_time_days, last_restocked_at, created_at, updated_at"
    )
    .eq("merchant_id", merchantId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load inventory: ${error.message}`);
  }

  return (data as InventoryItemRow[] | null) ?? [];
}

export function mapInventoryItemRowToProduct(row: InventoryItemRow): MerchantProduct {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    supplier: row.supplier,
    neighborhood: row.neighborhood,
    unitPrice: row.unit_price,
    sellingPrice: row.selling_price,
    packSize: row.pack_size,
    minOrder: row.min_order,
    stockOnHand: row.stock_on_hand,
    reorderPoint: row.reorder_point,
    reorderQuantity: row.reorder_quantity,
    leadTimeDays: row.lead_time_days,
    lastRestockedAt: row.last_restocked_at,
  };
}

export function toInventoryItemRow(
  merchantId: string,
  product: MerchantProduct
): InventoryItemRow {
  const timestamp = new Date().toISOString();

  return {
    id: product.id,
    merchant_id: merchantId,
    sku: product.sku,
    name: product.name,
    category: product.category,
    supplier: product.supplier,
    neighborhood: product.neighborhood,
    unit_price: product.unitPrice,
    selling_price: product.sellingPrice,
    pack_size: product.packSize,
    min_order: product.minOrder,
    stock_on_hand: product.stockOnHand,
    reorder_point: product.reorderPoint,
    reorder_quantity: product.reorderQuantity,
    lead_time_days: product.leadTimeDays,
    last_restocked_at: product.lastRestockedAt,
    updated_at: timestamp,
  };
}

function mapSupplierOrderRowsToOrders(
  orderRows: SupplierOrderRow[],
  itemRows: SupplierOrderItemRow[]
): MerchantOrder[] {
  const itemsByOrderId = itemRows.reduce<Record<string, MerchantOrderItem[]>>(
    (collection, itemRow) => {
      if (!collection[itemRow.supplier_order_id]) {
        collection[itemRow.supplier_order_id] = [];
      }

      collection[itemRow.supplier_order_id].push({
        productId: itemRow.product_id,
        name: itemRow.name,
        supplier: itemRow.supplier,
        quantity: itemRow.quantity,
        unitPrice: itemRow.unit_price,
        packSize: itemRow.pack_size,
      });

      return collection;
    },
    {}
  );

  return orderRows.map((row) => ({
    id: row.id,
    reference: row.reference,
    supplierName: row.supplier_name,
    status: row.status,
    source: row.source,
    sourceDetail:
      row.source_detail ??
      getMerchantOrderSourceDetail({
        source: row.source,
      }),
    createdAt: row.created_at,
    orderDate: formatShortDate(row.created_at),
    deliveryDate: row.eta_at ? formatShortDate(row.eta_at) : "TBD",
    deliveryAddress: row.delivery_address,
    notes: row.notes ?? undefined,
    items: itemsByOrderId[row.id] ?? [],
    totalAmount: row.total_amount,
  }));
}

export function toSupplierOrderRow(
  merchantId: string,
  order: MerchantOrder,
  etaAt: string | null
): SupplierOrderRow {
  return {
    id: order.id,
    merchant_id: merchantId,
    reference: order.reference,
    supplier_name: order.supplierName,
    status: order.status,
    source: order.source,
    source_detail: order.sourceDetail ?? getMerchantOrderSourceDetail(order),
    delivery_address: order.deliveryAddress,
    notes: order.notes ?? null,
    total_amount: order.totalAmount,
    created_at: order.createdAt,
    eta_at: etaAt,
    updated_at: new Date().toISOString(),
  };
}

export function toSupplierOrderItemRows(
  merchantId: string,
  orderId: string,
  items: MerchantOrderItem[]
): SupplierOrderItemRow[] {
  return items.map((item, index) => ({
    id: `${orderId}:item:${index + 1}`,
    merchant_id: merchantId,
    supplier_order_id: orderId,
    product_id: item.productId,
    name: item.name,
    supplier: item.supplier,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    pack_size: item.packSize,
  }));
}

function mapSaleRowToSale(row: SaleRow): MerchantSale {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    category: row.category,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    soldAt: row.sold_at,
    stockAfterSale: row.stock_after_sale,
    triggeredLowStock: row.triggered_low_stock,
    quickAddedProduct: row.quick_added_product || undefined,
  };
}

export function toSaleRow(merchantId: string, sale: MerchantSale): SaleRow {
  return {
    id: sale.id,
    merchant_id: merchantId,
    product_id: sale.productId,
    product_name: sale.productName,
    category: sale.category,
    quantity: sale.quantity,
    unit_price: sale.unitPrice,
    total_amount: sale.totalAmount,
    payment_method: sale.paymentMethod,
    sold_at: sale.soldAt,
    stock_after_sale: sale.stockAfterSale,
    triggered_low_stock: sale.triggeredLowStock,
    quick_added_product: sale.quickAddedProduct ?? false,
  };
}

function mapActivityRowToActivity(row: ActivityFeedRow): MerchantActivity {
  return {
    id: row.id,
    type: row.type,
    tone: row.tone,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export function toActivityFeedRow(
  merchantId: string,
  activity: MerchantActivity
): ActivityFeedRow {
  return {
    id: activity.id,
    merchant_id: merchantId,
    type: activity.type,
    tone: activity.tone,
    title: activity.title,
    detail: activity.detail,
    created_at: activity.createdAt,
  };
}

export function toDeliveryUpdateRow(
  merchantId: string,
  orderId: string,
  status: MerchantOrderStatus,
  note?: string
): DeliveryUpdateRow {
  return {
    id: `${orderId}:delivery:${crypto.randomUUID()}`,
    merchant_id: merchantId,
    supplier_order_id: orderId,
    status,
    note: note ?? null,
    created_at: new Date().toISOString(),
  };
}
