"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import {
  formatCdf,
  formatDateTime,
  getMerchantCategoryLabel,
  getMerchantInventoryMovementReasonLabel,
  type InventoryProduct,
  type MerchantInventoryMovement,
} from "@/lib/merchant-data";

const CATEGORY_OPTIONS = [
  "Beverages",
  "Staples",
  "Pantry",
  "Home Care",
  "General",
] as const;

const FILTER_OPTIONS = [
  { id: "all", label: "Tout" },
  { id: "Low Stock", label: "Stock bas" },
  { id: "Out of Stock", label: "Rupture" },
  { id: "Healthy", label: "Stock correct" },
] as const;

const ADJUSTMENT_REASON_OPTIONS = [
  { id: "manual-entry", label: "Entr\u00e9e manuelle" },
  { id: "inventory-correction", label: "Correction inventaire" },
  { id: "breakage-loss", label: "Casse / perte" },
  { id: "manual-output", label: "Sortie manuelle" },
] as const;

const STOCK_STYLES = {
  Healthy: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  "Low Stock": "text-amber-300 bg-amber-500/10 border-amber-500/20",
  "Out of Stock": "text-rose-300 bg-rose-500/10 border-rose-500/20",
} as const;

type InventoryFilter = (typeof FILTER_OPTIONS)[number]["id"];
type ControlMode = "create" | "edit" | "adjust" | null;

type CreateFormState = {
  name: string;
  category: (typeof CATEGORY_OPTIONS)[number];
  supplier: string;
  unitPrice: string;
  sellingPrice: string;
  packSize: string;
  reorderPoint: string;
  startingStock: string;
};

type EditFormState = {
  productId: string;
  supplier: string;
  unitPrice: string;
  sellingPrice: string;
  packSize: string;
  reorderPoint: string;
  isActive: boolean;
};

type AdjustFormState = {
  productId: string;
  reason: (typeof ADJUSTMENT_REASON_OPTIONS)[number]["id"];
  quantity: string;
  countedStock: string;
  note: string;
};

type FeedbackState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

function getInventoryStatusLabel(status: keyof typeof STOCK_STYLES): string {
  if (status === "Healthy") return "Stock correct";
  if (status === "Low Stock") return "Stock bas";
  return "Rupture";
}

function getActiveLabel(isActive: boolean): string {
  return isActive ? "Actif" : "Inactif";
}

function getMovementQuantityLabel(quantityChange: number): string {
  return quantityChange > 0 ? `+${quantityChange}` : `${quantityChange}`;
}

function buildDefaultCreateForm(): CreateFormState {
  return {
    name: "",
    category: "General",
    supplier: "",
    unitPrice: "",
    sellingPrice: "",
    packSize: "",
    reorderPoint: "",
    startingStock: "",
  };
}

function buildEditForm(
  product: Pick<
    InventoryProduct,
    | "id"
    | "supplier"
    | "unitPrice"
    | "sellingPrice"
    | "packSize"
    | "reorderPoint"
    | "isActive"
  >
): EditFormState {
  return {
    productId: product.id,
    supplier: product.supplier,
    unitPrice: String(product.unitPrice),
    sellingPrice: String(product.sellingPrice),
    packSize: product.packSize,
    reorderPoint: String(product.reorderPoint),
    isActive: product.isActive,
  };
}

function buildAdjustForm(productId: string): AdjustFormState {
  return {
    productId,
    reason: "manual-entry",
    quantity: "",
    countedStock: "",
    note: "",
  };
}

function isCorrectionReason(reason: AdjustFormState["reason"]): boolean {
  return reason === "inventory-correction";
}

function sanitizeMovementNote(note?: string): string | null {
  if (!note) {
    return null;
  }

  const cleanedNote = note
    .replace(/\s*\[seed:[^[\]]+\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedNote.length > 0 ? cleanedNote : null;
}

function getMovementReasonDetail(movement: MerchantInventoryMovement): string {
  const cleanedNote = sanitizeMovementNote(movement.note);
  if (cleanedNote) {
    return cleanedNote;
  }

  if (movement.reason === "stock_initial") {
    return "Stock de d\u00e9part enregistr\u00e9 \u00e0 la cr\u00e9ation du produit.";
  }

  if (movement.reason === "sale") {
    return "Sortie enregistr\u00e9e apr\u00e8s une vente.";
  }

  if (movement.reason === "order-received") {
    return "Entr\u00e9e enregistr\u00e9e apr\u00e8s r\u00e9ception de la commande.";
  }

  if (movement.reason === "manual-entry") {
    return "Entr\u00e9e ajout\u00e9e manuellement au stock.";
  }

  if (movement.reason === "inventory-correction") {
    return "Stock align\u00e9 sur le comptage r\u00e9el.";
  }

  if (movement.reason === "breakage-loss") {
    return "Perte ou casse retir\u00e9e du stock.";
  }

  return "Sortie manuelle enregistr\u00e9e hors vente.";
}

export default function InventoryPage() {
  const router = useRouter();
  const { setCartItems } = useCart();
  const {
    inventory,
    inventoryMovements,
    lowStockProducts,
    launchDraftOrder,
    buildDraftFromProduct,
    findProduct,
    activeOrders,
    createInventoryProduct,
    updateInventoryProduct,
    adjustInventoryProductStock,
  } = useMerchantData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryFilter>("all");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [controlMode, setControlMode] = useState<ControlMode>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(
    buildDefaultCreateForm()
  );
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustFormState>({
    productId: "",
    reason: "manual-entry",
    quantity: "",
    countedStock: "",
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const activeProducts = inventory.filter((product) => product.isActive);
  const filteredProducts = inventory.filter((product) => {
    const matchesSearch =
      deferredSearch.length === 0 ||
      [
        product.name,
        product.supplier,
        product.category,
        product.neighborhood,
        product.isActive ? "actif" : "inactif",
      ]
        .join(" ")
        .toLowerCase()
        .includes(deferredSearch);
    const matchesStatus =
      statusFilter === "all" || product.stockStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const outOfStockCount = activeProducts.filter(
    (product) => product.stockStatus === "Out of Stock"
  ).length;
  const lowStockCount = activeProducts.filter(
    (product) => product.stockStatus === "Low Stock"
  ).length;
  const healthyCount = activeProducts.filter(
    (product) => product.stockStatus === "Healthy"
  ).length;
  const inactiveCount = inventory.filter((product) => !product.isActive).length;
  const unitsOnOrder = activeProducts.reduce(
    (runningTotal, product) => runningTotal + product.onOrder,
    0
  );
  const trackedInboundOrdersCount = activeOrders.filter(
    (order) => order.status !== "Draft"
  ).length;
  const selectedProduct =
    (selectedProductId != null
      ? inventory.find((product) => product.id === selectedProductId) ?? null
      : null) ??
    (controlMode === "adjust" && adjustForm.productId
      ? inventory.find((product) => product.id === adjustForm.productId) ?? null
      : null);
  const selectedProductMovements = selectedProduct
    ? inventoryMovements
        .filter((movement) => movement.productId === selectedProduct.id)
        .slice(0, 8)
    : [];
  const adjustmentTarget =
    adjustForm.productId.length > 0
      ? inventory.find((product) => product.id === adjustForm.productId) ?? null
      : null;
  const isCorrectionAdjustment = isCorrectionReason(adjustForm.reason);
  const adjustmentInputText = isCorrectionAdjustment
    ? adjustForm.countedStock
    : adjustForm.quantity;
  const adjustmentInputValue =
    adjustmentInputText.trim().length > 0 ? Number(adjustmentInputText) : null;
  const quantityChangePreview =
    adjustmentTarget &&
    adjustmentInputValue != null &&
    Number.isFinite(adjustmentInputValue) &&
    (isCorrectionAdjustment ? adjustmentInputValue >= 0 : adjustmentInputValue > 0)
      ? isCorrectionAdjustment
        ? Math.round(adjustmentInputValue) - adjustmentTarget.stockOnHand
        : adjustForm.reason === "manual-entry"
          ? Math.round(adjustmentInputValue)
          : -Math.round(adjustmentInputValue)
      : null;
  const projectedStock =
    adjustmentTarget && quantityChangePreview != null
      ? isCorrectionAdjustment
        ? Math.round(adjustmentInputValue ?? 0)
        : adjustmentTarget.stockOnHand + quantityChangePreview
      : null;
  const adjustmentFieldLabel = isCorrectionAdjustment
    ? "Stock compt\u00e9"
    : "Quantit\u00e9";
  const adjustmentFieldPlaceholder = isCorrectionAdjustment
    ? "Ex. 18"
    : "Ex. 6";
  const impactLabel =
    quantityChangePreview == null
      ? "Saisissez une valeur"
      : quantityChangePreview === 0
        ? "Aucun \u00e9cart"
        : `${getMovementQuantityLabel(quantityChangePreview)} unit\u00e9s`;

  const inputClass =
    "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30";
  const labelClass =
    "block text-xs font-medium uppercase tracking-[0.18em] text-muted";

  function resetFeedback() {
    setFeedback(null);
  }

  function openCreatePanel() {
    resetFeedback();
    setControlMode("create");
    setCreateForm(buildDefaultCreateForm());
  }

  function openEditPanel(product: InventoryProduct) {
    resetFeedback();
    setSelectedProductId(product.id);
    setEditForm(buildEditForm(product));
    setControlMode("edit");
  }

  function openAdjustPanel(productId?: string) {
    const targetProduct =
      (productId
        ? inventory.find((product) => product.id === productId)
        : selectedProductId
          ? inventory.find((product) => product.id === selectedProductId)
          : inventory[0]) ?? null;

    if (!targetProduct) {
      setFeedback({
        type: "error",
        text: "Ajoutez d'abord un produit avant de faire un ajustement de stock.",
      });
      return;
    }

    resetFeedback();
    setSelectedProductId(targetProduct.id);
    setAdjustForm(buildAdjustForm(targetProduct.id));
    setControlMode("adjust");
  }

  function closeControlPanel() {
    setControlMode(null);
    setIsSaving(false);
  }

  async function handleReorder(productId: string) {
    try {
      resetFeedback();
      const product = findProduct(productId);

      if (product && !product.isActive) {
        setFeedback({
          type: "error",
          text: `${product.name} est inactif. Réactivez-le avant de préparer un réappro.`,
        });
        return;
      }

      const reorderDraft = buildDraftFromProduct(productId);
      if (reorderDraft.length === 0) return;

      const draftOrder = await launchDraftOrder({
        items: reorderDraft,
        source: "Inventory",
        reason: "inventory-reorder",
        productName: product?.name,
      });
      if (!draftOrder) return;

      setCartItems(
        reorderDraft,
        "replace",
        "Inventory",
        draftOrder.id,
        "inventory-restock"
      );
      router.push("/orders/new");
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible d'ouvrir ce brouillon de réappro.",
      });
    }
  }

  async function handleCreateProduct() {
    setIsSaving(true);
    resetFeedback();

    try {
      const startingStock = Number(createForm.startingStock || "0");
      const createdProduct = await createInventoryProduct({
        name: createForm.name,
        category: createForm.category,
        supplier: createForm.supplier,
        unitPrice: Number(createForm.unitPrice),
        sellingPrice: Number(createForm.sellingPrice),
        packSize: createForm.packSize,
        reorderPoint: Number(createForm.reorderPoint),
        startingStock,
      });

      setSelectedProductId(createdProduct.id);
      setEditForm(buildEditForm(createdProduct));
      setAdjustForm(buildAdjustForm(createdProduct.id));
      setControlMode("edit");
      setCreateForm(buildDefaultCreateForm());
      setFeedback({
        type: "success",
        text:
          startingStock > 0
            ? `${createdProduct.name} a \u00e9t\u00e9 ajout\u00e9 au stock avec un mouvement de stock initial.`
            : `${createdProduct.name} a \u00e9t\u00e9 ajout\u00e9 au stock.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible d'ajouter ce produit pour le moment.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveProduct() {
    if (!editForm) {
      return;
    }

    setIsSaving(true);
    resetFeedback();

    try {
      const updatedProduct = await updateInventoryProduct({
        productId: editForm.productId,
        supplier: editForm.supplier,
        unitPrice: Number(editForm.unitPrice),
        sellingPrice: Number(editForm.sellingPrice),
        packSize: editForm.packSize,
        reorderPoint: Number(editForm.reorderPoint),
        isActive: editForm.isActive,
      });

      setSelectedProductId(updatedProduct.id);
      setEditForm(buildEditForm(updatedProduct));
      setFeedback({
        type: "success",
        text: `${updatedProduct.name} a été mis à jour.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer ce produit pour le moment.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdjustStock() {
    setIsSaving(true);
    resetFeedback();

    try {
      const result = await adjustInventoryProductStock({
        productId: adjustForm.productId,
        reason: adjustForm.reason,
        quantity: isCorrectionAdjustment
          ? undefined
          : Number(adjustForm.quantity),
        countedStock: isCorrectionAdjustment
          ? adjustForm.countedStock.trim().length > 0
            ? Number(adjustForm.countedStock)
            : undefined
          : undefined,
        note: adjustForm.note,
      });

      setSelectedProductId(result.product.id);
      setAdjustForm((current) => ({
        ...current,
        productId: result.product.id,
        quantity: "",
        countedStock: "",
        note: "",
      }));
      setFeedback({
        type: "success",
        text: `${result.product.name} ajust\u00e9 : ${getMerchantInventoryMovementReasonLabel(
          result.movement.reason
        ).toLowerCase()} enregistr\u00e9e. Stock actuel : ${result.product.stockOnHand} unit\u00e9s.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible d'ajuster ce stock pour le moment.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Stock
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Pilotez le stock et gardez les rayons prêts à vendre
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Le stock devient ici un vrai poste de contrôle marchand : ajoutez un
            produit, mettez à jour ses données utiles, ajustez les quantités et
            suivez les derniers mouvements sans alourdir le MVP.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={openCreatePanel}
              className="accent-gradient btn-shine w-full rounded-xl px-4 py-3 text-sm font-medium text-background sm:w-auto"
            >
              Ajouter un produit
            </button>
            <button
              type="button"
              onClick={() => openAdjustPanel()}
              className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-accent/30 hover:text-accent sm:w-auto"
            >
              Ajuster le stock
            </button>
          </div>
        </div>

        <div className="glass-card flex w-full max-w-xl flex-col gap-3 rounded-2xl p-4 lg:min-w-[360px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Réappro urgent</p>
              <p className="mt-1 text-lg font-semibold text-primary">
                {lowStockProducts.length} produits à suivre
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-right">
              <p className="text-xs text-rose-200">En rupture</p>
              <p className="text-lg font-semibold text-rose-300">
                {outOfStockCount}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 3).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleReorder(product.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-surface/60 px-3 py-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-bright"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {product.stockOnHand} en stock, réappro {product.reorderQuantity} |{" "}
                    {product.supplier}
                  </p>
                </div>
                <span className="text-xs font-medium text-accent">Préparer</span>
              </button>
            ))}

            {lowStockProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-secondary">
                Aucun rayon urgent à relancer pour l'instant.
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            {inactiveCount} produit{inactiveCount === 1 ? "" : "s"} inactif
            {inactiveCount === 1 ? "" : "s"} gardé
            {inactiveCount === 1 ? "" : "s"} hors rotation.
          </p>
        </div>
      </section>

      {controlMode ? (
        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-card rounded-2xl p-5">
            {controlMode === "create" ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-primary">
                      Ajouter un produit
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      Créez vite une fiche simple pour commencer à suivre le produit
                      dans le stock.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeControlPanel}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                  >
                    Fermer
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className={labelClass}>Nom du produit</span>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ex. Jus ananas 24 x 33cl"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Catégorie</span>
                    <select
                      value={createForm.category}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          category: event.target.value as (typeof CATEGORY_OPTIONS)[number],
                        }))
                      }
                      className={inputClass}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {getMerchantCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className={labelClass}>Fournisseur principal</span>
                    <input
                      type="text"
                      value={createForm.supplier}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          supplier: event.target.value,
                        }))
                      }
                      placeholder="Ex. Marché Gambela Cash & Carry"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Prix d'achat</span>
                    <input
                      type="number"
                      min="0"
                      value={createForm.unitPrice}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          unitPrice: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Prix de vente</span>
                    <input
                      type="number"
                      min="0"
                      value={createForm.sellingPrice}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          sellingPrice: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Unité / conditionnement</span>
                    <input
                      type="text"
                      value={createForm.packSize}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          packSize: event.target.value,
                        }))
                      }
                      placeholder="Ex. carton de 24 bouteilles"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Seuil de réappro</span>
                    <input
                      type="number"
                      min="0"
                      value={createForm.reorderPoint}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          reorderPoint: event.target.value,
                        }))
                      }
                      placeholder="Ex. 6"
                      className={inputClass}
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className={labelClass}>Stock initial</span>
                    <input
                      type="number"
                      min="0"
                      value={createForm.startingStock}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          startingStock: event.target.value,
                        }))
                      }
                      placeholder="Ex. 12"
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeControlPanel}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateProduct}
                    disabled={isSaving}
                    className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Enregistrement..." : "Enregistrer le produit"}
                  </button>
                </div>
              </div>
            ) : null}

            {controlMode === "edit" && editForm && selectedProduct ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-primary">
                      Modifier le produit
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      Ajustez les champs pratiques sans alourdir la fiche article.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeControlPanel}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                  >
                    Fermer
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-4">
                  <p className="text-xs text-muted">Produit sélectionné</p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {selectedProduct.name}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    {getMerchantCategoryLabel(selectedProduct.category)} |{" "}
                    {selectedProduct.sku}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Fournisseur</span>
                    <input
                      type="text"
                      value={editForm.supplier}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, supplier: event.target.value }
                            : current
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Conditionnement</span>
                    <input
                      type="text"
                      value={editForm.packSize}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, packSize: event.target.value }
                            : current
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Prix d'achat</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.unitPrice}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, unitPrice: event.target.value }
                            : current
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Prix de vente</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.sellingPrice}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, sellingPrice: event.target.value }
                            : current
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Seuil de réappro</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.reorderPoint}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, reorderPoint: event.target.value }
                            : current
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Statut du produit</span>
                    <select
                      value={editForm.isActive ? "active" : "inactive"}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? {
                                ...current,
                                isActive: event.target.value === "active",
                              }
                            : current
                        )
                      }
                      className={inputClass}
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openAdjustPanel(selectedProduct.id)}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                  >
                    Ajuster le stock
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProduct}
                    disabled={isSaving}
                    className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Enregistrement..." : "Enregistrer les changements"}
                  </button>
                </div>
              </div>
            ) : null}

            {controlMode === "adjust" ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-primary">
                      Ajuster le stock
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      Enregistrez une entrée, une correction, une casse ou une
                      sortie manuelle sans passer par un flux lourd.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeControlPanel}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                  >
                    Fermer
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className={labelClass}>Produit</span>
                    <select
                      value={adjustForm.productId}
                      onChange={(event) => {
                        const nextProductId = event.target.value;
                        setSelectedProductId(nextProductId);
                        setAdjustForm((current) => ({
                          ...current,
                          productId: nextProductId,
                        }));
                      }}
                      className={inputClass}
                    >
                      {inventory.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({getActiveLabel(product.isActive).toLowerCase()})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className={labelClass}>Raison</span>
                    <select
                      value={adjustForm.reason}
                      onChange={(event) =>
                        setAdjustForm((current) => ({
                          ...current,
                          reason: event.target.value as AdjustFormState["reason"],
                          quantity: "",
                          countedStock: "",
                        }))
                      }
                      className={inputClass}
                    >
                      {ADJUSTMENT_REASON_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className={labelClass}>{adjustmentFieldLabel}</span>
                    <input
                      type="number"
                      min={isCorrectionAdjustment ? "0" : "1"}
                      value={
                        isCorrectionAdjustment
                          ? adjustForm.countedStock
                          : adjustForm.quantity
                      }
                      onChange={(event) =>
                        setAdjustForm((current) => ({
                          ...current,
                          quantity: isCorrectionAdjustment
                            ? current.quantity
                            : event.target.value,
                          countedStock: isCorrectionAdjustment
                            ? event.target.value
                            : current.countedStock,
                        }))
                      }
                      placeholder={adjustmentFieldPlaceholder}
                      className={inputClass}
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className={labelClass}>Note interne</span>
                    <textarea
                      value={adjustForm.note}
                      onChange={(event) =>
                        setAdjustForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Ex. Comptage du soir, 2 unités cassées, entrée hors commande..."
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-border bg-surface/40 p-4">
                  <p className="text-xs text-muted">Impact prévu</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted">Stock actuel</p>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {adjustmentTarget
                          ? `${adjustmentTarget.stockOnHand} unités`
                          : "Choisissez un produit"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Impact</p>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          quantityChangePreview == null
                            ? "text-primary"
                            : quantityChangePreview > 0
                              ? "text-emerald-300"
                              : quantityChangePreview < 0
                                ? "text-rose-300"
                                : "text-secondary"
                        }`}
                      >
                        {impactLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Stock après ajustement</p>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {projectedStock != null && projectedStock >= 0
                          ? `${projectedStock} unités`
                          : isCorrectionAdjustment
                            ? "Saisissez le stock compté"
                            : "Saisissez une quantité"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeControlPanel}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAdjustStock}
                    disabled={isSaving}
                    className="accent-gradient btn-shine rounded-xl px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Enregistrement..." : "Appliquer l'ajustement"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="glass-card rounded-2xl p-5">
            {selectedProduct ? (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-primary">
                      {selectedProduct.name}
                    </h2>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        STOCK_STYLES[selectedProduct.stockStatus]
                      }`}
                    >
                      {getInventoryStatusLabel(selectedProduct.stockStatus)}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        selectedProduct.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : "border-slate-500/20 bg-slate-500/10 text-slate-300"
                      }`}
                    >
                      {getActiveLabel(selectedProduct.isActive)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-secondary">
                    {getMerchantCategoryLabel(selectedProduct.category)} |{" "}
                    {selectedProduct.packSize}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface/40 p-4">
                    <p className="text-xs text-muted">Stock</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      {selectedProduct.stockOnHand} unités
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Seuil de réappro {selectedProduct.reorderPoint}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface/40 p-4">
                    <p className="text-xs text-muted">En commande</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      {selectedProduct.onOrder} unités
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Réappro conseillé {selectedProduct.reorderQuantity}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface/40 p-4">
                    <p className="text-xs text-muted">Prix d'achat</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      {formatCdf(selectedProduct.unitPrice)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Vente {formatCdf(selectedProduct.sellingPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface/40 p-4">
                    <p className="text-xs text-muted">Fournisseur</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {selectedProduct.supplier}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {selectedProduct.neighborhood}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => openEditPanel(selectedProduct)}
                    className="w-full rounded-xl border border-border px-3 py-3 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary sm:w-auto"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdjustPanel(selectedProduct.id)}
                    className="w-full rounded-xl border border-border px-3 py-3 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary sm:w-auto"
                  >
                    Ajuster le stock
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(selectedProduct.id)}
                    disabled={!selectedProduct.isActive}
                    className="w-full rounded-xl border border-accent/20 bg-accent/10 px-3 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Préparer le réappro
                  </button>
                </div>

                {!selectedProduct.isActive ? (
                  <div className="rounded-2xl border border-slate-500/20 bg-slate-500/10 px-4 py-3 text-sm text-slate-200">
                    Produit inactif : visible pour le suivi et l'historique, mais
                    non vendu et non pr\u00e9par\u00e9 pour le r\u00e9appro tant qu'il
                    n'est pas r\u00e9activ\u00e9.
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-base font-semibold text-primary">
                      Derniers mouvements
                    </h3>
                    <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      {selectedProductMovements.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedProductMovements.length > 0 ? (
                      selectedProductMovements.map((movement) => (
                        <div
                          key={movement.id}
                          className="rounded-2xl border border-border bg-surface/40 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                Type
                              </p>
                              <p className="mt-1 text-sm font-medium text-primary">
                                {getMerchantInventoryMovementReasonLabel(movement.reason)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                Quantité
                              </p>
                              <p
                                className={`mt-1 text-sm font-semibold ${
                                  movement.quantityChange > 0
                                    ? "text-emerald-300"
                                    : "text-rose-300"
                                }`}
                              >
                                {getMovementQuantityLabel(movement.quantityChange)} unités
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                Date
                              </p>
                              <p className="mt-1 text-sm text-primary">
                                {formatDateTime(movement.createdAt)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                Stock après
                              </p>
                              <p className="mt-1 text-sm text-primary">
                                {movement.stockAfter} unités
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                                Motif
                              </p>
                              <p className="mt-1 text-sm text-secondary">
                                {getMovementReasonDetail(movement)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                        <p className="text-sm text-primary">
                          Aucun mouvement enregistré pour ce produit.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Les ventes, réceptions et ajustements manuels apparaîtront ici.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
                <p className="text-sm text-primary">
                  Choisissez un produit à modifier ou à ajuster.
                </p>
                <p className="mt-1 text-xs text-muted">
                  Le résumé produit et l'historique léger de stock s'afficheront ici.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Stock correct</p>
          <p className="mt-2 font-heading text-3xl font-bold text-emerald-300">
            {healthyCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Produits actifs au-dessus du seuil de réappro
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Stock bas</p>
          <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
            {lowStockCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Réappro à préparer cette semaine
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Rupture</p>
          <p className="mt-2 font-heading text-3xl font-bold text-rose-300">
            {outOfStockCount}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Risque de ventes perdues sur rayon vide
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">Stock attendu</p>
          <p className="mt-2 font-heading text-3xl font-bold text-accent">
            {unitsOnOrder}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Dans {trackedInboundOrdersCount} commande
            {trackedInboundOrdersCount === 1 ? "" : "s"} envoyée
            {trackedInboundOrdersCount === 1 ? "" : "s"} ou en route
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Table de contrôle du stock
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Recherchez un article, repérez son état, puis modifiez ou ajustez-le
              directement depuis la même page.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row md:items-start">
            <label className="relative block w-full md:min-w-[260px]">
              <span className="sr-only">Rechercher dans le stock</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit, un fournisseur, une catégorie..."
                className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const active = option.id === statusFilter;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStatusFilter(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border text-secondary hover:border-border-bright hover:text-primary"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          {filteredProducts.map((product) => (
            <div
              key={`mobile-${product.id}`}
              className={`rounded-2xl border border-border bg-surface/50 p-4 ${
                product.isActive ? "" : "opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => openEditPanel(product)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-base font-medium text-primary">{product.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {getMerchantCategoryLabel(product.category)} | {product.packSize}
                  </p>
                  <p className="mt-2 text-xs text-secondary">
                    {product.supplier} | {product.neighborhood}
                  </p>
                </button>
                <div className="flex flex-wrap justify-end gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                      STOCK_STYLES[product.stockStatus]
                    }`}
                  >
                    {getInventoryStatusLabel(product.stockStatus)}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                      product.isActive
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-500/20 bg-slate-500/10 text-slate-300"
                    }`}
                  >
                    {getActiveLabel(product.isActive)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-surface/40 p-3">
                  <p className="text-xs text-muted">Stock</p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {product.stockOnHand} unités
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Seuil {product.reorderPoint}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface/40 p-3">
                  <p className="text-xs text-muted">En commande</p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {product.onOrder} unités
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Réappro {product.reorderQuantity}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface/40 p-3">
                  <p className="text-xs text-muted">Prix</p>
                  <p className="mt-1 text-sm font-medium text-accent">
                    {formatCdf(product.unitPrice)}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Vente {formatCdf(product.sellingPrice)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openAdjustPanel(product.id)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                >
                  Ajuster le stock
                </button>
                <button
                  type="button"
                  onClick={() => openEditPanel(product)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                >
                  Modifier le produit
                </button>
                <button
                  type="button"
                  onClick={() => handleReorder(product.id)}
                  disabled={!product.isActive}
                  className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    !product.isActive
                      ? "cursor-not-allowed border-border text-muted opacity-60"
                      : product.stockStatus === "Healthy"
                        ? "border-border text-secondary hover:border-accent/40 hover:text-primary"
                        : "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20"
                  }`}
                >
                  Préparer le réappro
                </button>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-primary">
                Aucun produit ne correspond Ã  cette vue.
              </p>
              <p className="mt-1 text-xs text-muted">
                Essayez une autre recherche, changez le filtre ou ajoutez un nouveau
                produit.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Produit
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Fournisseur
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Stock
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  En commande
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Prix
                </th>
                <th className="px-3 py-3 text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  État
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`transition-colors hover:bg-surface-bright/40 ${
                    product.isActive ? "" : "opacity-75"
                  }`}
                >
                  <td className="px-3 py-4 align-top">
                    <button
                      type="button"
                      onClick={() => openEditPanel(product)}
                      className="text-left"
                    >
                      <p className="font-medium text-primary">{product.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{getMerchantCategoryLabel(product.category)}</span>
                        <span>|</span>
                        <span>{product.packSize}</span>
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="text-secondary">{product.supplier}</p>
                    <p className="mt-1 text-xs text-muted">
                      {product.neighborhood}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-primary">
                      {product.stockOnHand} unités
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Seuil de réappro {product.reorderPoint}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-primary">
                      {product.onOrder} unités
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Réappro conseillé {product.reorderQuantity}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <p className="font-medium text-accent">
                      {formatCdf(product.unitPrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Vente {formatCdf(product.sellingPrice)}
                    </p>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          STOCK_STYLES[product.stockStatus]
                        }`}
                      >
                        {getInventoryStatusLabel(product.stockStatus)}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          product.isActive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-500/20 bg-slate-500/10 text-slate-300"
                        }`}
                      >
                        {getActiveLabel(product.isActive)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right align-top">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openAdjustPanel(product.id)}
                        className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                      >
                        Ajuster
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPanel(product)}
                        className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent/30 hover:text-primary"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(product.id)}
                        disabled={!product.isActive}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          !product.isActive
                            ? "cursor-not-allowed border-border text-muted opacity-60"
                            : product.stockStatus === "Healthy"
                              ? "border-border text-secondary hover:border-accent/40 hover:text-primary"
                              : "border-accent/20 bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        Préparer le réappro
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-sm text-primary">
                Aucun produit ne correspond à cette vue.
              </p>
              <p className="mt-1 text-xs text-muted">
                Essayez une autre recherche, changez le filtre ou ajoutez un nouveau
                produit.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
