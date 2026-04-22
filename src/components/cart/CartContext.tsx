"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  supplier: string;
  unit_price: number;
  min_order: string;
  quantity: number;
}

export type CartDraftSource = "Inventory" | "Orders" | "Home";
export type CartDraftIntent =
  | "manual-new-order"
  | "repeat-saved-basket"
  | "low-stock-restock"
  | "inventory-restock"
  | "order-history-restock";

export function getDraftIntentLabel(draftIntent: CartDraftIntent): string {
  if (draftIntent === "repeat-saved-basket") return "Panier relancé";
  if (draftIntent === "low-stock-restock") return "Réappro stock bas";
  if (draftIntent === "inventory-restock") return "Réappro stock";
  if (draftIntent === "order-history-restock") return "Panier relancé";
  return "Nouvelle commande";
}

export function getDraftIntentDescription(draftIntent: CartDraftIntent): string {
  if (draftIntent === "repeat-saved-basket") {
    return "Ce panier a été relancé depuis une ancienne commande fournisseur pour pouvoir être renvoyé après une vérification rapide.";
  }

  if (draftIntent === "low-stock-restock") {
    return "Ce panier a été préparé depuis une alerte de stock bas pour réapprovisionner avant la rupture.";
  }

  if (draftIntent === "inventory-restock") {
    return "Ce panier a été préparé depuis le stock pour lancer un réappro directement depuis la liste de surveillance.";
  }

  if (draftIntent === "order-history-restock") {
    return "Ce panier a été relancé depuis une ancienne commande fournisseur et reste modifiable avant l'envoi.";
  }

  return "Vous avez démarré un nouveau panier fournisseur. Ajoutez ou retirez des articles avant de vérifier et confirmer.";
}

interface CartContextValue {
  items: CartItem[];
  draftSource: CartDraftSource;
  draftOrderId: string | null;
  draftIntent: CartDraftIntent;
  addItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  setCartItems: (
    items: CartItem[],
    mode?: "replace" | "merge",
    source?: CartDraftSource,
    draftOrderId?: string | null,
    draftIntent?: CartDraftIntent
  ) => void;
  startDraft: (
    source: CartDraftSource,
    draftIntent?: CartDraftIntent
  ) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "zando_cart";
const CART_SOURCE_STORAGE_KEY = "zando_cart_source";
const CART_DRAFT_ORDER_KEY = "zando_cart_draft_order_id";
const CART_DRAFT_INTENT_KEY = "zando_cart_draft_intent";

function isCartDraftIntent(value: string | null): value is CartDraftIntent {
  return (
    value === "manual-new-order" ||
    value === "repeat-saved-basket" ||
    value === "low-stock-restock" ||
    value === "inventory-restock" ||
    value === "order-history-restock"
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [draftSource, setDraftSource] = useState<CartDraftSource>("Orders");
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [draftIntent, setDraftIntent] =
    useState<CartDraftIntent>("manual-new-order");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));

      const savedSource = localStorage.getItem(CART_SOURCE_STORAGE_KEY);
      if (
        savedSource === "Inventory" ||
        savedSource === "Orders" ||
        savedSource === "Home"
      ) {
        setDraftSource(savedSource);
      }

      const savedDraftOrderId = localStorage.getItem(CART_DRAFT_ORDER_KEY);
      if (savedDraftOrderId) {
        setDraftOrderId(savedDraftOrderId);
      }

      const savedDraftIntent = localStorage.getItem(CART_DRAFT_INTENT_KEY);
      if (isCartDraftIntent(savedDraftIntent)) {
        setDraftIntent(savedDraftIntent);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(CART_SOURCE_STORAGE_KEY, draftSource);
  }, [draftSource]);

  useEffect(() => {
    if (draftOrderId) {
      localStorage.setItem(CART_DRAFT_ORDER_KEY, draftOrderId);
    } else {
      localStorage.removeItem(CART_DRAFT_ORDER_KEY);
    }
  }, [draftOrderId]);

  useEffect(() => {
    localStorage.setItem(CART_DRAFT_INTENT_KEY, draftIntent);
  }, [draftIntent]);

  const addItem = useCallback((product: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const setCartItems = useCallback(
    (
      nextItems: CartItem[],
      mode: "replace" | "merge" = "replace",
      source?: CartDraftSource,
      nextDraftOrderId?: string | null,
      nextDraftIntent?: CartDraftIntent
    ) => {
      setItems((prev) => {
        if (mode === "replace") {
          return nextItems.filter((item) => item.quantity > 0);
        }

        const mergedItems = new Map(prev.map((item) => [item.id, item]));

        nextItems.forEach((item) => {
          const existing = mergedItems.get(item.id);
          mergedItems.set(item.id, {
            ...item,
            quantity: (existing?.quantity ?? 0) + item.quantity,
          });
        });

        return Array.from(mergedItems.values()).filter(
          (item) => item.quantity > 0
        );
      });
      if (source) {
        setDraftSource(source);
      }
      if (typeof nextDraftOrderId !== "undefined") {
        setDraftOrderId(nextDraftOrderId);
      }
      if (nextDraftIntent) {
        setDraftIntent(nextDraftIntent);
      }
      setIsOpen(true);
    },
    []
  );

  const startDraft = useCallback(
    (
      source: CartDraftSource,
      nextDraftIntent: CartDraftIntent = "manual-new-order"
    ) => {
    setItems([]);
    setDraftSource(source);
    setDraftOrderId(null);
    setDraftIntent(nextDraftIntent);
    setIsOpen(false);
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setDraftSource("Orders");
    setDraftOrderId(null);
    setDraftIntent("manual-new-order");
    setIsOpen(false);
  }, []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        draftSource,
        draftOrderId,
        draftIntent,
        addItem,
        removeItem,
        updateQty,
        setCartItems,
        startDraft,
        clearCart,
        totalItems,
        totalAmount,
        isOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
