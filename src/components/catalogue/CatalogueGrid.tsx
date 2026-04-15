"use client";

import { useCart } from "@/components/cart/CartContext";
import { formatCdf, type InventoryProduct } from "@/lib/merchant-data";

const STOCK_STYLES = {
  Healthy: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  "Low Stock": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  "Out of Stock": "bg-rose-500/10 text-rose-300 border-rose-500/20",
} as const;

export default function CatalogueGrid({
  products,
}: {
  products: InventoryProduct[];
}) {
  const { addItem, items, updateQty, openCart } = useCart();

  function getCartQty(id: string): number {
    return items.find((item) => item.id === id)?.quantity ?? 0;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const currentQty = getCartQty(product.id);
        const outOfStock = product.stockStatus === "Out of Stock";

        return (
          <div
            key={product.id}
            className="glass-card card-glow flex flex-col gap-4 rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-medium leading-tight text-primary">
                  {product.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {product.supplier} | {product.neighborhood}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  STOCK_STYLES[product.stockStatus]
                }`}
              >
                {product.stockStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface/50 p-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  Price
                </p>
                <p className="mt-1 text-lg font-semibold text-accent">
                  {formatCdf(product.unitPrice)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  On hand
                </p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {product.stockOnHand}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-secondary">
              <p>{product.category}</p>
              <p>
                Pack size {product.packSize} | Min order {product.minOrder}
              </p>
              <p>
                Reorder point {product.reorderPoint} | Inbound {product.onOrder}
              </p>
            </div>

            {currentQty > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-border px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, currentQty - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-base text-secondary transition-colors hover:bg-surface-bright hover:text-primary"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold text-primary">
                    {currentQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, currentQty + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-base text-secondary transition-colors hover:bg-surface-bright hover:text-primary"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openCart}
                  className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  Open draft
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={outOfStock}
                onClick={() =>
                  addItem({
                    id: product.id,
                    name: product.name,
                    supplier: product.supplier,
                    unit_price: product.unitPrice,
                    min_order: product.minOrder,
                  })
                }
                className="accent-gradient btn-shine w-full rounded-xl py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                {outOfStock ? "Unavailable now" : "Add to draft order"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
