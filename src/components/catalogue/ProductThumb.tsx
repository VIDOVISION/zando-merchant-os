"use client";

import { useEffect, useMemo, useState } from "react";

import type { InventoryProduct } from "@/lib/merchant-data";

type ProductThumbProduct = Pick<InventoryProduct, "id" | "name" | "category">;

const CATEGORY_LABELS: Record<string, string> = {
  Beverages: "Boisson",
  Pantry: "Epicerie",
  "Home Care": "Maison",
  Staples: "Base",
};

function toAssetSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return (words[0]?.[0] ?? "P").concat(words[1]?.[0] ?? "").toUpperCase();
}

function getProductIconCandidates(product: ProductThumbProduct): string[] {
  const productNameSlug = toAssetSlug(product.name);
  const categorySlug = toAssetSlug(product.category);

  return [
    `/product-icons/${product.id}.webp`,
    `/product-icons/${product.id}.png`,
    `/product-icons/${productNameSlug}.webp`,
    `/product-icons/${productNameSlug}.png`,
    `/product-icons/category-${categorySlug}.webp`,
    `/product-icons/category-${categorySlug}.png`,
  ];
}

export default function ProductThumb({
  product,
}: {
  product: ProductThumbProduct;
}) {
  const candidates = useMemo(() => getProductIconCandidates(product), [product]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const currentSrc = candidates[candidateIndex];
  const showFallback = !currentSrc;
  const categoryLabel = CATEGORY_LABELS[product.category] ?? "Produit";

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface/70 sm:h-14 sm:w-14">
      {showFallback ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-accent/10 px-1 text-center">
          <span className="text-sm font-semibold leading-none text-accent">
            {getProductInitials(product.name)}
          </span>
          <span className="mt-1 max-w-full truncate text-[8px] font-medium uppercase leading-none tracking-[0.08em] text-muted">
            {categoryLabel}
          </span>
        </div>
      ) : (
        // Product icons are merchant-provided local assets; fallback prevents broken image UI.
        <img
          src={currentSrc}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      )}
    </div>
  );
}
