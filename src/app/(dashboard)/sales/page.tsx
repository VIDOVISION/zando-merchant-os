"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { useMerchantData } from "@/components/merchant/MerchantDataContext";
import { formatCdf, formatDateTime } from "@/lib/merchant-data";

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Card"] as const;
const SALES_HISTORY_RANGES = [
  "Today",
  "Last 7 days",
  "Last 30 days",
  "Custom date range",
] as const;
const PAYMENT_FILTER_OPTIONS = ["All methods", ...PAYMENT_METHODS] as const;

type SalesHistoryRange = (typeof SALES_HISTORY_RANGES)[number];
type SalesPaymentFilter = (typeof PAYMENT_FILTER_OPTIONS)[number];

function getPaymentMethodLabel(method: SalesPaymentFilter): string {
  if (method === "Cash") return "Espèces";
  if (method === "Mobile Money") return "Mobile Money";
  if (method === "Card") return "Carte";
  return "Tous les modes";
}

function getSalesRangeLabel(range: SalesHistoryRange): string {
  if (range === "Today") return "Aujourd’hui";
  if (range === "Last 7 days") return "7 derniers jours";
  if (range === "Last 30 days") return "30 derniers jours";
  return "Période personnalisée";
}

function getSalesCategoryLabel(category: string): string {
  if (category === "Beverages") return "Boissons";
  if (category === "Home Care") return "Entretien";
  if (category === "General") return "Divers";
  return category;
}

function getSalesStockStatusLabel(status: string): string {
  if (status === "Out of Stock") return "Rupture";
  if (status === "Low Stock") return "Stock bas";
  if (status === "Healthy") return "Stock correct";
  return status;
}

function getLocalDateTimeValue(dateString: string): string {
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function getDefaultSaleTime(): string {
  return getLocalDateTimeValue(new Date().toISOString());
}

function getLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseLocalDateInput(value: string, endOfDay = false): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
}

function isDateWithinRange(
  dateString: string,
  range: SalesHistoryRange,
  customStartDate: string,
  customEndDate: string
): boolean {
  const targetDate = new Date(dateString);
  const now = new Date();

  if (range === "Today") {
    return getLocalDateValue(targetDate) === getLocalDateValue(now);
  }

  if (range === "Last 7 days") {
    const startDate = parseLocalDateInput(getLocalDateValue(addDays(now, -6)));
    return startDate != null && targetDate >= startDate && targetDate <= now;
  }

  if (range === "Last 30 days") {
    const startDate = parseLocalDateInput(getLocalDateValue(addDays(now, -29)));
    return startDate != null && targetDate >= startDate && targetDate <= now;
  }

  const startDate = parseLocalDateInput(customStartDate);
  const endDate = parseLocalDateInput(customEndDate, true);

  if (startDate == null || endDate == null) {
    return true;
  }

  return targetDate >= startDate && targetDate <= endDate;
}

function getSalesHistoryRangeLabel(
  range: SalesHistoryRange,
  customStartDate: string,
  customEndDate: string
): string {
  if (range !== "Custom date range") {
    return getSalesRangeLabel(range);
  }

  if (!customStartDate || !customEndDate) {
    return "Période personnalisée";
  }

  return `${customStartDate} au ${customEndDate}`;
}

function buildTopSellerSummary(
  salesEntries: Array<{
    productId: string;
    productName: string;
    quantity: number;
    totalAmount: number;
  }>
) {
  return Object.values(
    salesEntries.reduce<
      Record<
        string,
        {
          productId: string;
          productName: string;
          unitsSold: number;
          revenue: number;
        }
      >
    >((collection, sale) => {
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
  ).sort((left, right) => right.unitsSold - left.unitsSold);
}

export default function SalesPage() {
  const router = useRouter();
  const { setCartItems } = useCart();
  const {
    state,
    inventory,
    sales,
    salesLowStockInsights,
    recordSale,
    voidLatestSale,
    buildDraftFromProduct,
    launchDraftOrder,
    findProduct,
  } = useMerchantData();

  const [productQuery, setProductQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("Cash");
  const [soldAt, setSoldAt] = useState(getDefaultSaleTime());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddCategory, setQuickAddCategory] = useState("Boissons");
  const [quickAddSellingPrice, setQuickAddSellingPrice] = useState("");
  const [quickAddStartingStock, setQuickAddStartingStock] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState<SalesHistoryRange>("Last 7 days");
  const [historyProductSearch, setHistoryProductSearch] = useState("");
  const [historyPaymentMethod, setHistoryPaymentMethod] =
    useState<SalesPaymentFilter>("All methods");
  const [customStartDate, setCustomStartDate] = useState(() =>
    getLocalDateValue(addDays(new Date(), -6))
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    getLocalDateValue(new Date())
  );

  const deferredQuery = useDeferredValue(productQuery.trim().toLowerCase());
  const deferredHistorySearch = useDeferredValue(
    historyProductSearch.trim().toLowerCase()
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(state.products.map((product) => product.category))).sort(),
    [state.products]
  );

  const suggestions = useMemo(
    () =>
      inventory
        .filter((product) => {
          if (deferredQuery.length === 0) return false;

          return [product.name, product.category, product.supplier]
            .join(" ")
            .toLowerCase()
            .includes(deferredQuery);
        })
        .sort((left, right) => {
          const leftStarts = left.name.toLowerCase().startsWith(deferredQuery) ? 0 : 1;
          const rightStarts =
            right.name.toLowerCase().startsWith(deferredQuery) ? 0 : 1;

          if (leftStarts !== rightStarts) {
            return leftStarts - rightStarts;
          }

          return left.name.localeCompare(right.name);
        })
        .slice(0, 6),
    [deferredQuery, inventory]
  );

  const exactMatch = inventory.find(
    (product) => product.name.toLowerCase() === deferredQuery
  );
  const selectedProduct =
    inventory.find((product) => product.id === selectedProductId) ?? exactMatch ?? null;
  const quantityValue = Number.parseInt(quantity, 10) || 0;
  const unitPriceValue = Number.parseInt(unitPrice, 10) || 0;
  const quickAddStartingStockValue =
    Number.parseInt(quickAddStartingStock, 10) || 0;
  const suggestedUnitPrice = selectedProduct?.sellingPrice ?? 0;
  const resolvedUnitPrice =
    unitPriceValue ||
    suggestedUnitPrice ||
    Number.parseInt(quickAddSellingPrice, 10) ||
    0;
  const totalValue = quantityValue * resolvedUnitPrice;
  const currentStock = selectedProduct?.stockOnHand ?? null;
  const remainingStock =
    currentStock != null ? currentStock - quantityValue : null;
  const insufficientStock =
    currentStock != null && quantityValue > currentStock;
  const lowStockAfterSale =
    selectedProduct != null &&
    remainingStock != null &&
    remainingStock >= 0 &&
    remainingStock <= selectedProduct.reorderPoint;
  const quickAddStockTooLow =
    showQuickAdd &&
    quickAddStartingStock.trim().length > 0 &&
    quickAddStartingStockValue < quantityValue;
  const canSaveSale =
    (selectedProduct != null ||
      (showQuickAdd &&
        quickAddName.trim().length > 0 &&
        quickAddCategory.trim().length > 0)) &&
    quantityValue > 0 &&
    resolvedUnitPrice > 0 &&
    !insufficientStock &&
    !quickAddStockTooLow;
  const historyRangeLabel = getSalesHistoryRangeLabel(
    historyRange,
    customStartDate,
    customEndDate
  );
  const parsedCustomStartDate = parseLocalDateInput(customStartDate);
  const parsedCustomEndDate = parseLocalDateInput(customEndDate, true);
  const customRangeInvalid =
    historyRange === "Custom date range" &&
    customStartDate.length > 0 &&
    customEndDate.length > 0 &&
    parsedCustomStartDate != null &&
    parsedCustomEndDate != null &&
    parsedCustomStartDate.getTime() > parsedCustomEndDate.getTime();
  const filteredSales = useMemo(
    () => {
      if (customRangeInvalid) {
        return [];
      }

      return sales.filter((sale) => {
        const matchesDate = isDateWithinRange(
          sale.soldAt,
          historyRange,
          customStartDate,
          customEndDate
        );
        const matchesProduct =
          deferredHistorySearch.length === 0 ||
          sale.productName.toLowerCase().includes(deferredHistorySearch) ||
          sale.category.toLowerCase().includes(deferredHistorySearch);
        const matchesPayment =
          historyPaymentMethod === "All methods" ||
          sale.paymentMethod === historyPaymentMethod;

        return matchesDate && matchesProduct && matchesPayment;
      });
    },
    [
      customRangeInvalid,
      customEndDate,
      customStartDate,
      deferredHistorySearch,
      historyPaymentMethod,
      historyRange,
      sales,
    ]
  );
  const filteredTopSellingSummary = useMemo(
    () => buildTopSellerSummary(filteredSales).slice(0, 3),
    [filteredSales]
  );
  const filteredLowStockInsights = useMemo(
    () => {
      if (customRangeInvalid) {
        return [];
      }

      return salesLowStockInsights.filter((insight) => {
        const matchesDate = isDateWithinRange(
          insight.soldAt,
          historyRange,
          customStartDate,
          customEndDate
        );
        const matchesProduct =
          deferredHistorySearch.length === 0 ||
          insight.productName.toLowerCase().includes(deferredHistorySearch);

        return matchesDate && matchesProduct;
      });
    },
    [
      customRangeInvalid,
      customEndDate,
      customStartDate,
      deferredHistorySearch,
      historyRange,
      salesLowStockInsights,
    ]
  );
  const latestSaleId = sales[0]?.id ?? null;
  const todaySales = useMemo(
    () => sales.filter((sale) => isDateWithinRange(sale.soldAt, "Today", "", "")),
    [sales]
  );
  const lastSevenDaySales = useMemo(
    () =>
      sales.filter((sale) =>
        isDateWithinRange(sale.soldAt, "Last 7 days", "", "")
      ),
    [sales]
  );
  const quickSales = todaySales.length > 0 ? todaySales : lastSevenDaySales;
  const quickRangeLabel =
    todaySales.length > 0 ? "aujourd’hui" : "sur les 7 derniers jours";
  const quickTopSellingSummary = useMemo(
    () => buildTopSellerSummary(quickSales).slice(0, 3),
    [quickSales]
  );
  const quickLowStockInsights = useMemo(
    () =>
      salesLowStockInsights.filter((insight) =>
        isDateWithinRange(
          insight.soldAt,
          todaySales.length > 0 ? "Today" : "Last 7 days",
          "",
          ""
        )
      ),
    [salesLowStockInsights, todaySales.length]
  );

  function resetForm() {
    setProductQuery("");
    setSelectedProductId(null);
    setQuantity("1");
    setUnitPrice("");
    setPaymentMethod("Cash");
    setSoldAt(getDefaultSaleTime());
    setShowQuickAdd(false);
    setQuickAddName("");
    setQuickAddCategory(getSalesCategoryLabel(categoryOptions[0] ?? "General"));
    setQuickAddSellingPrice("");
    setQuickAddStartingStock("");
  }

  function handleSelectProduct(productId: string) {
    const product = inventory.find((entry) => entry.id === productId);
    if (!product) return;

    setSelectedProductId(product.id);
    setProductQuery(product.name);
    setUnitPrice(String(product.sellingPrice));
    setShowQuickAdd(false);
    setQuickAddName("");
    setQuickAddSellingPrice("");
    setQuickAddStartingStock("");
    setFormError(null);
    setFormSuccess(null);
  }

  function handleProductQueryChange(value: string) {
    setProductQuery(value);
    setSelectedProductId(null);
    setFormSuccess(null);

    if (!showQuickAdd) {
      setUnitPrice("");
    }

    if (showQuickAdd) {
      setQuickAddName(value);
    }
  }

  function handleEnableQuickAdd() {
    setShowQuickAdd(true);
    setQuickAddName(productQuery.trim());
    setQuickAddSellingPrice(unitPrice || String(selectedProduct?.sellingPrice ?? ""));
    setFormError(null);
    setFormSuccess(null);
  }

  async function handleRestockProduct(productId: string) {
    try {
      setFormError(null);
      const reorderDraft = buildDraftFromProduct(productId);
      const product = findProduct(productId);
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
      setFormError(
        error instanceof Error
          ? error.message
          : "Impossible de préparer ce réappro pour le moment."
      );
    }
  }

  async function handleVoidLatestSale() {
    const latestSale = sales[0];
    if (!latestSale) return;

    const shouldVoid = window.confirm(
      `Annuler la dernière vente de ${latestSale.productName} et remettre ${latestSale.quantity} unité${latestSale.quantity === 1 ? "" : "s"} en stock ?`
    );
    if (!shouldVoid) return;

    const removedSale = await voidLatestSale();
    if (!removedSale) {
      setFormError("Il n'y a plus de vente récente à annuler.");
      return;
    }

    setFormError(null);
    setFormSuccess(
      `${removedSale.productName} a été retiré de l'historique des ventes et le stock a été remis à jour.`
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const resolvedProductId = selectedProductId ?? exactMatch?.id ?? null;
      const sale = await recordSale({
        productId: resolvedProductId,
        quantity: quantityValue,
        unitPrice: resolvedUnitPrice,
        paymentMethod,
        soldAt: new Date(soldAt).toISOString(),
        quickAddProduct:
          resolvedProductId == null && showQuickAdd
            ? {
                name: quickAddName.trim() || productQuery.trim(),
                category: quickAddCategory.trim(),
                sellingPrice:
                  Number.parseInt(quickAddSellingPrice || unitPrice, 10) ||
                  resolvedUnitPrice,
                startingStock:
                  quickAddStartingStock.trim().length > 0
                    ? Number.parseInt(quickAddStartingStock, 10)
                    : null,
              }
            : null,
      });

      setFormSuccess(
        `Vente enregistrée : ${sale.productName} pour ${formatCdf(
          sale.totalAmount
        )} par ${getPaymentMethodLabel(sale.paymentMethod)}.`
      );
      resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Impossible d'enregistrer la vente."
      );
    }
  }

  const salesPeriodValue = filteredSales.reduce(
    (runningTotal, sale) => runningTotal + sale.totalAmount,
    0
  );
  const salesPeriodUnits = filteredSales.reduce(
    (runningTotal, sale) => runningTotal + sale.quantity,
    0
  );
  const quickSalesValue = quickSales.reduce(
    (runningTotal, sale) => runningTotal + sale.totalAmount,
    0
  );
  const quickSalesUnits = quickSales.reduce(
    (runningTotal, sale) => runningTotal + sale.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="order-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent/80">
            Ventes
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gradient">
            Enregistrez vite les ventes du magasin
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-secondary">
            Pensé pour le commerce de quartier à {state.profile.neighborhood},{" "}
            {state.profile.city}. Recherchez ce qui est déjà en stock, ajoutez vite
            un article manquant, et gardez un stock juste en CDF.
          </p>
        </div>
      </section>

      <section className="order-5 glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-primary">
                Filtres des ventes
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Vérifiez les ventes par période, mode de paiement ou produit, sans
                ouvrir un grand rapport.
              </p>
            </div>
            <p className="text-xs text-muted">
              {filteredSales.length} vente
              {filteredSales.length === 1 ? "" : "s"} pour {historyRangeLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SALES_HISTORY_RANGES.map((range) => {
              const isActive = historyRange === range;

              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setHistoryRange(range)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-accent/30 bg-accent/15 text-accent"
                      : "border-border bg-surface/50 text-secondary hover:border-accent/20 hover:text-primary"
                  }`}
                >
                  {getSalesRangeLabel(range)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.25fr_0.85fr]">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Rechercher un produit
              </span>
              <input
                type="text"
                value={historyProductSearch}
                onChange={(event) => setHistoryProductSearch(event.target.value)}
                placeholder="Rechercher un produit dans l'historique..."
                className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Mode de paiement
              </span>
              <select
                value={historyPaymentMethod}
                onChange={(event) =>
                  setHistoryPaymentMethod(event.target.value as SalesPaymentFilter)
                }
                className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              >
                {PAYMENT_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getPaymentMethodLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {historyRange === "Custom date range" && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    Date de début
                  </span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    Date de fin
                  </span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                  />
                </label>
              </div>

              {customRangeInvalid && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  La date de début doit être avant ou égale à la date de fin.
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface/35 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Résumé de la période
                </p>
                <p className="mt-1 text-sm text-secondary">
                  {filteredLowStockInsights.length} alerte
                  {filteredLowStockInsights.length === 1 ? "" : "s"} de stock bas
                  liée{filteredLowStockInsights.length === 1 ? "" : "s"} à cette vue.
                </p>
              </div>
              <p className="text-xs text-muted">{historyRangeLabel}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-surface/50 p-4">
                <p className="text-xs text-muted">Total ventes</p>
                <p className="mt-2 font-heading text-3xl font-bold text-accent">
                  {formatCdf(salesPeriodValue)}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Pour {historyRangeLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface/50 p-4">
                <p className="text-xs text-muted">Quantités vendues</p>
                <p className="mt-2 font-heading text-3xl font-bold text-primary">
                  {salesPeriodUnits}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Vue rapide de ce qui est sorti sur la période
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface/50 p-4">
                <p className="text-xs text-muted">Produit le plus vendu</p>
                <p className="mt-2 font-heading text-2xl font-bold text-primary">
                  {filteredTopSellingSummary[0]?.productName ?? "Aucune vente pour le moment"}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {filteredTopSellingSummary[0]
                    ? `${filteredTopSellingSummary[0].unitsSold} unités vendues sur la période`
                    : "Le produit qui sort le plus s'affiche ici"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface/50 p-4">
                <p className="text-xs text-muted">Ventes enregistrées</p>
                <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
                  {filteredSales.length}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Enregistrées pour {historyRangeLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="order-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">
            {todaySales.length > 0 ? "Ventes du jour" : "Ventes des 7 derniers jours"}
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-accent">
            {formatCdf(quickSalesValue)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Vue rapide pour {quickRangeLabel}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">
            {todaySales.length > 0
              ? "Quantités vendues aujourd’hui"
              : "Quantités vendues sur 7 jours"}
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-primary">
            {quickSalesUnits}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Ce qui est passé au comptoir
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">
            {todaySales.length > 0
              ? "Produit le plus vendu aujourd’hui"
              : "Produit le plus vendu sur 7 jours"}
          </p>
          <p className="mt-2 font-heading text-2xl font-bold text-primary">
            {quickTopSellingSummary[0]?.productName ?? "Aucune vente pour le moment"}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {quickTopSellingSummary[0]
              ? `${quickTopSellingSummary[0].unitsSold} unités vendues ${quickRangeLabel}`
              : "Le produit qui sort le plus s'affiche ici"}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-muted">
            {todaySales.length > 0
              ? "Ventes enregistrées du jour"
              : "Ventes enregistrées sur 7 jours"}
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-amber-300">
            {quickSales.length}
          </p>
          <p className="mt-1 text-xs text-secondary">
            Enregistrées pour la vue rapide
          </p>
        </div>
      </section>

      <section className="contents">
        <div className="order-2 glass-card rounded-2xl p-5">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Enregistrer une vente
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Recherchez d'abord dans le stock. Si l'article manque, ajoutez-le vite
              et enregistrez la vente dans le même passage.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="relative">
              <label className="block text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Produit
              </label>
              <input
                type="text"
                value={productQuery}
                onChange={(event) => handleProductQueryChange(event.target.value)}
                placeholder="Rechercher dans le stock ou saisir un nouvel article..."
                className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />

              {suggestions.length > 0 && !showQuickAdd && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-border bg-background/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-md">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product.id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-bright"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {product.stockOnHand} en stock | {formatCdf(product.sellingPrice)}
                        </p>
                      </div>
                      <span className="ml-3 text-xs text-secondary">
                        {getSalesCategoryLabel(product.category)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="rounded-2xl border border-border bg-surface/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {selectedProduct.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {selectedProduct.stockOnHand} en stock |{" "}
                      {getSalesCategoryLabel(selectedProduct.category)} |{" "}
                      {selectedProduct.supplier}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                        Prix conseillé {formatCdf(selectedProduct.sellingPrice)}
                      </span>
                      <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-secondary">
                        Stock actuel {selectedProduct.stockOnHand}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId(null);
                      setProductQuery("");
                      setUnitPrice("");
                    }}
                    className="text-xs text-muted transition-colors hover:text-primary"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            )}

            {selectedProduct == null && productQuery.trim().length > 1 && !showQuickAdd && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-primary">
                    Produit non trouvé pour le moment
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Choisissez une suggestion ou ajoutez vite cet article pour enregistrer la vente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableQuickAdd}
                  className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  Ajouter vite "{productQuery.trim()}"
                </button>
              </div>
            )}

            {showQuickAdd && (
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">
                      Ajouter un produit manquant
                    </h3>
                    <p className="mt-1 text-xs text-secondary">
                      Gardez ça simple. L'article est ajouté au stock et la vente est
                      enregistrée en une seule étape.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="text-xs text-muted transition-colors hover:text-primary"
                  >
                    Fermer
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                      Nom du produit
                    </span>
                    <input
                      type="text"
                      value={quickAddName}
                      onChange={(event) => setQuickAddName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      placeholder="ex. Jus Tam Tam 1L"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                      Catégorie
                    </span>
                    <input
                      type="text"
                      list="sales-category-options"
                      value={quickAddCategory}
                      onChange={(event) => setQuickAddCategory(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      placeholder="Boissons"
                    />
                    <datalist id="sales-category-options">
                      {categoryOptions.map((category) => (
                        <option key={category} value={getSalesCategoryLabel(category)} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                      Prix de vente
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={quickAddSellingPrice}
                      onChange={(event) => {
                        setQuickAddSellingPrice(event.target.value);
                        if (!unitPrice) {
                          setUnitPrice(event.target.value);
                        }
                      }}
                      className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      placeholder="12000"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                      Stock de départ
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={quickAddStartingStock}
                      onChange={(event) => setQuickAddStartingStock(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      placeholder="Optionnel"
                    />
                    <p className="mt-2 text-[11px] text-muted">
                      Laissez vide pour démarrer le stock avec la quantité vendue maintenant.
                    </p>
                  </label>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Quantité
                </span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Prix unitaire
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                  placeholder="0"
                />
                {selectedProduct && (
                  <p className="mt-2 text-[11px] text-muted">
                    Prix conseillé : {formatCdf(selectedProduct.sellingPrice)}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Mode de paiement
                </span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as (typeof PAYMENT_METHODS)[number])
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option} value={option}>
                      {getPaymentMethodLabel(option)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  Heure
                </span>
                <input
                  type="datetime-local"
                  value={soldAt}
                  onChange={(event) => setSoldAt(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-primary focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Total de la vente
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-accent">
                {formatCdf(totalValue)}
              </p>
              {selectedProduct && (
                <p className="mt-1 text-xs text-secondary">
                  {quantityValue} unité{quantityValue === 1 ? "" : "s"} à{" "}
                  {formatCdf(resolvedUnitPrice)} l'unité
                </p>
              )}
            </div>

            {selectedProduct && currentStock != null && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  insufficientStock
                    ? "border border-rose-500/20 bg-rose-500/10 text-rose-200"
                    : lowStockAfterSale
                      ? "border border-amber-500/20 bg-amber-500/10 text-amber-200"
                      : "border border-border bg-surface/40 text-secondary"
                }`}
              >
                {insufficientStock
                  ? `Il ne reste que ${currentStock} unité${currentStock === 1 ? "" : "s"} de ${selectedProduct.name}. Réduisez la quantité ou préparez le réappro d'abord.`
                  : lowStockAfterSale
                    ? `Après cette vente, il restera ${remainingStock} unité${remainingStock === 1 ? "" : "s"} de ${selectedProduct.name}. Préparez le réappro ensuite.`
                    : `Après cette vente, il restera ${remainingStock} unité${remainingStock === 1 ? "" : "s"} de ${selectedProduct.name}.`}
              </div>
            )}

            {quickAddStockTooLow && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                Le stock de départ doit être au moins de {quantityValue} pour couvrir cette vente.
              </div>
            )}

            {formError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSaveSale}
              className="accent-gradient btn-shine w-full rounded-xl px-4 py-3 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enregistrer la vente
            </button>
          </form>
        </div>

        <div className="contents">
          <div className="order-7 glass-card rounded-2xl p-5">
            <h2 className="font-heading text-lg font-semibold text-primary">
              Produits les plus vendus
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Vue rapide de ce qui se vend le plus sur {historyRangeLabel}.
            </p>

            <div className="mt-4 space-y-3">
              {filteredTopSellingSummary.map((product, index) => (
                <div
                  key={product.productId}
                  className="rounded-2xl border border-border bg-surface/50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {index + 1}. {product.productName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {product.unitsSold} unités vendues sur la période
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-accent">
                      {formatCdf(product.revenue)}
                    </span>
                  </div>
                </div>
              ))}

              {filteredTopSellingSummary.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-primary">Aucune vente trouvée sur cette période.</p>
                  <p className="mt-1 text-xs text-muted">
                    Essayez une période plus large pour voir ce qui part le plus vite.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="order-4 glass-card rounded-2xl p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-primary">
                  Produits qui baissent à cause des ventes
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  Les produits qui baissent avec les ventes récentes pour réagir vite.
                </p>
              </div>
              <p className="text-xs text-muted">
                Affichage : {todaySales.length > 0 ? "aujourd’hui" : "7 derniers jours"}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {quickLowStockInsights.map((insight) => {
                const product = findProduct(insight.productId);

                return (
                  <div
                    key={insight.saleId}
                    className="rounded-2xl border border-border bg-surface/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {insight.productName}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Vendu {insight.quantitySold} | {insight.stockAfterSale} restant
                          {insight.stockAfterSale === 1 ? "" : "s"} |{" "}
                          {product?.supplier ?? "Fournisseur non disponible"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          insight.stockStatus === "Out of Stock"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {getSalesStockStatusLabel(insight.stockStatus)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-secondary">
                        Réappro conseillé : {product?.reorderQuantity ?? insight.quantitySold}{" "}
                        unité{(product?.reorderQuantity ?? insight.quantitySold) === 1 ? "" : "s"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRestockProduct(insight.productId)}
                        className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                      >
                        Préparer le réappro
                      </button>
                    </div>
                  </div>
                );
              })}

              {quickLowStockInsights.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm text-primary">
                    Aucun produit n'est passé en stock bas avec les ventes récentes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="order-6 glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Historique des ventes
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Journal simple des ventes filtré selon la période et la vue choisies.
            </p>
          </div>
          <span className="text-xs text-muted">
            {filteredSales.length} vente{filteredSales.length === 1 ? "" : "s"} trouvée
            {filteredSales.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {filteredSales.slice(0, 20).map((sale) => (
            <div
              key={sale.id}
              className="rounded-2xl border border-border bg-surface/50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-primary">
                    {sale.productName}
                    </p>
                    {sale.quickAddedProduct && (
                      <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        Nouvel article
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {sale.quantity} unités | {getPaymentMethodLabel(sale.paymentMethod)} |{" "}
                    {formatDateTime(sale.soldAt)}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Stock après vente : {sale.stockAfterSale}
                  </p>
                  {sale.triggeredLowStock && (
                    <p className="mt-1 text-xs text-amber-200">
                      Cette vente a fait passer le produit en stock bas.
                    </p>
                  )}
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-lg font-semibold text-accent">
                    {formatCdf(sale.totalAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatCdf(sale.unitPrice)} l'unité
                  </p>
                </div>
              </div>

              {sale.id === latestSaleId && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Dernière vente enregistrée
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      À utiliser seulement pour corriger la dernière erreur. Le stock
                      sera remis automatiquement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleVoidLatestSale}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/20"
                  >
                    Annuler la dernière vente
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredSales.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-primary">Aucune vente ne correspond à ces filtres.</p>
              <p className="mt-1 text-xs text-muted">
                Essayez une période plus large ou effacez les filtres produit et paiement.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
