import { getNumber } from "@/lib/zando-format";

export const ZANDO_SHOP_SALES_STORAGE_KEY = "zando_shop_sales";
export const ZANDO_SHOP_INVENTORY_STORAGE_KEY = "zando_shop_inventory";

export type ZandoShopSalePaymentMethod = "Cash" | "Mobile Money" | "Credit";

export interface ZandoShopSale {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  selling_price: number;
  total: number;
  payment_method: ZandoShopSalePaymentMethod;
  created_at: string;
}

export interface ZandoShopInventoryItem {
  product_id?: string;
  name: string;
  quantity?: number;
  selling_price?: number;
}

interface StoredZandoShopSale extends Partial<ZandoShopSale> {
  sold_at?: string;
}

export function normalizeShopSale(sale: StoredZandoShopSale): ZandoShopSale {
  const quantity = Math.max(1, Math.floor(getNumber(sale.quantity)));
  const sellingPrice = Math.max(0, getNumber(sale.selling_price));
  const createdAt =
    typeof sale.created_at === "string"
      ? sale.created_at
      : typeof sale.sold_at === "string"
        ? sale.sold_at
        : new Date().toISOString();

  return {
    id: sale.id ?? `shop-sale-${crypto.randomUUID()}`,
    product_id: typeof sale.product_id === "string" ? sale.product_id : undefined,
    product_name: sale.product_name?.trim() ?? "Unnamed product",
    quantity,
    selling_price: sellingPrice,
    total: quantity * sellingPrice,
    payment_method: sale.payment_method ?? "Cash",
    created_at: createdAt,
  };
}

export function getShopSales(): ZandoShopSale[] {
  if (typeof window === "undefined") return [];

  try {
    const rawSales = window.localStorage.getItem(ZANDO_SHOP_SALES_STORAGE_KEY);
    const parsedSales = rawSales ? JSON.parse(rawSales) : [];
    if (!Array.isArray(parsedSales)) return [];

    return parsedSales
      .filter((sale): sale is StoredZandoShopSale =>
        Boolean(
          sale &&
            typeof sale.id === "string" &&
            typeof sale.product_name === "string" &&
            (typeof sale.created_at === "string" || typeof sale.sold_at === "string")
        )
      )
      .map(normalizeShopSale)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [];
  }
}

export function saveShopSales(sales: ZandoShopSale[]): ZandoShopSale[] {
  const normalizedSales = sales.map(normalizeShopSale);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        ZANDO_SHOP_SALES_STORAGE_KEY,
        JSON.stringify(normalizedSales)
      );
    } catch {
      // Local boutique sales are best-effort until the shop schema exists.
    }
  }

  return normalizedSales;
}

export function addShopSale(sale: ZandoShopSale): ZandoShopSale[] {
  const nextSales = [normalizeShopSale(sale), ...getShopSales()];
  return saveShopSales(nextSales);
}

export function getShopInventory(): ZandoShopInventoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const rawInventory = window.localStorage.getItem(ZANDO_SHOP_INVENTORY_STORAGE_KEY);
    const parsedInventory = rawInventory ? JSON.parse(rawInventory) : [];
    if (!Array.isArray(parsedInventory)) return [];

    return parsedInventory
      .filter((item): item is ZandoShopInventoryItem =>
        Boolean(item && typeof item.name === "string" && item.name.trim().length > 0)
      )
      .map((item) => ({
        product_id: typeof item.product_id === "string" ? item.product_id : undefined,
        name: item.name.trim(),
        quantity: getNumber(item.quantity),
        selling_price: getNumber(item.selling_price),
      }));
  } catch {
    return [];
  }
}

export function isShopSaleFromToday(sale: ZandoShopSale): boolean {
  const createdAt = new Date(sale.created_at);
  if (Number.isNaN(createdAt.getTime())) return false;

  return createdAt.toDateString() === new Date().toDateString();
}
