export const ZANDO_SHOP_CART_STORAGE_KEY = "zando_shop_cart";

export interface ZandoShopCartItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function getCartItemTotal(item: Pick<ZandoShopCartItem, "quantity" | "unit_price">): number {
  return item.quantity * item.unit_price;
}

export function normalizeShopCartItem(item: ZandoShopCartItem): ZandoShopCartItem {
  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const unitPrice = Math.max(0, Number(item.unit_price) || 0);

  return {
    product_id: item.product_id,
    name: item.name,
    quantity,
    unit_price: unitPrice,
    total: quantity * unitPrice,
  };
}

export function getShopCart(): ZandoShopCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const rawCart = window.localStorage.getItem(ZANDO_SHOP_CART_STORAGE_KEY);
    const parsedCart = rawCart ? JSON.parse(rawCart) : [];
    if (!Array.isArray(parsedCart)) return [];

    return parsedCart
      .filter((item): item is ZandoShopCartItem =>
        Boolean(item && typeof item.product_id === "string" && typeof item.name === "string")
      )
      .map(normalizeShopCartItem);
  } catch {
    return [];
  }
}

export function saveShopCart(cart: ZandoShopCartItem[]): ZandoShopCartItem[] {
  const normalizedCart = cart.map(normalizeShopCartItem);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ZANDO_SHOP_CART_STORAGE_KEY, JSON.stringify(normalizedCart));
  }

  return normalizedCart;
}

export function clearShopCart(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ZANDO_SHOP_CART_STORAGE_KEY);
}

export function getShopCartItemsCount(cart: ZandoShopCartItem[]): number {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function getShopCartTotal(cart: ZandoShopCartItem[]): number {
  return cart.reduce((total, item) => total + item.total, 0);
}
