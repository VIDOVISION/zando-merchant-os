import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCdf } from "@/lib/merchant-data";

export const dynamic = "force-dynamic";

type SaleRow = {
  id: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  payment_method: "Cash" | "Mobile Money" | "Card";
  sold_at: string;
};

type SupplierOrderStatus =
  | "Draft"
  | "Pending"
  | "Confirmed"
  | "Packed"
  | "In Transit"
  | "Delivered"
  | "Cancelled";

type SupplierOrderRow = {
  id: string;
  reference: string;
  supplier_name: string;
  status: SupplierOrderStatus;
  total_amount: number;
  created_at: string;
  eta_at: string | null;
};

type PaymentFlowItem = {
  id: string;
  kind: "incoming" | "outgoing";
  label: string;
  title: string;
  detail: string;
  amount: number;
  createdAt: string;
};

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Card"] as const;

function getPaymentMethodLabel(method: (typeof PAYMENT_METHODS)[number]): string {
  if (method === "Cash") return "Espèces";
  if (method === "Mobile Money") return "Mobile Money";
  return "Carte";
}

function getSupplierStatusLabel(status: SupplierOrderStatus): string {
  if (status === "Pending") return "En attente fournisseur";
  if (status === "Delivered") return "Réceptionnée";
  return "En route";
}

function formatFlowDate(dateString: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatShortDate(dateString: string | null): string {
  if (!dateString) return "Date à confirmer";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

function isMovingSupplierOrder(status: SupplierOrderStatus): boolean {
  return status === "Confirmed" || status === "Packed" || status === "In Transit";
}

function sumAmounts(rows: Array<{ total_amount: number | null }>): number {
  return rows.reduce((total, row) => total + (row.total_amount ?? 0), 0);
}

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [salesResult, supplierOrdersResult] = await Promise.all([
    supabase
      .from("sales")
      .select("id, product_name, quantity, total_amount, payment_method, sold_at")
      .eq("merchant_id", user.id)
      .order("sold_at", { ascending: false }),
    supabase
      .from("supplier_orders")
      .select("id, reference, supplier_name, status, total_amount, created_at, eta_at")
      .eq("merchant_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sales = ((salesResult.data as SaleRow[] | null) ?? []).filter(
    (sale) => sale.total_amount != null
  );
  const supplierOrders = ((supplierOrdersResult.data as SupplierOrderRow[] | null) ?? []).filter(
    (order) => order.status !== "Draft" && order.status !== "Cancelled"
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const salesToday = sales.filter((sale) => new Date(sale.sold_at) >= todayStart);
  const salesWeek = sales.filter((sale) => new Date(sale.sold_at) >= weekStart);

  const payableOrders = supplierOrders.filter((order) => order.status !== "Delivered");
  const pendingSupplierOrders = supplierOrders.filter((order) => order.status === "Pending");
  const movingSupplierOrders = supplierOrders.filter((order) =>
    isMovingSupplierOrder(order.status)
  );
  const settledSupplierOrders = supplierOrders.filter(
    (order) => order.status === "Delivered"
  );

  const cashInToday = sumAmounts(salesToday);
  const cashInWeek = sumAmounts(salesWeek);
  const supplierPayableAmount = sumAmounts(payableOrders);
  const supplierSettledAmount = sumAmounts(settledSupplierOrders);
  const pendingSupplierAmount = sumAmounts(pendingSupplierOrders);
  const movingSupplierAmount = sumAmounts(movingSupplierOrders);

  const paymentMethodBreakdown = PAYMENT_METHODS.map((method) => {
    const methodSales = salesWeek.filter((sale) => sale.payment_method === method);

    return {
      method,
      label: getPaymentMethodLabel(method),
      amount: sumAmounts(methodSales),
      count: methodSales.length,
    };
  });

  const recentFlows: PaymentFlowItem[] = [
    ...sales.map((sale) => ({
      id: `sale-${sale.id}`,
      kind: "incoming" as const,
      label: "Encaissement",
      title: sale.product_name,
      detail: `${sale.quantity} unité${sale.quantity === 1 ? "" : "s"} · ${getPaymentMethodLabel(
        sale.payment_method
      )}`,
      amount: sale.total_amount,
      createdAt: sale.sold_at,
    })),
    ...supplierOrders.map((order) => ({
      id: `order-${order.id}`,
      kind: "outgoing" as const,
      label: "Paiement fournisseur",
      title: order.supplier_name,
      detail: `${order.reference} · ${getSupplierStatusLabel(order.status)}`,
      amount: order.total_amount,
      createdAt: order.created_at,
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          Paiements
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Suivez ce que vous avez encaissé, ce qu&apos;il reste à payer aux
          fournisseurs, et les flux récents de la boutique.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-xl p-6">
          <p className="text-xs text-muted">Encaissements du jour</p>
          <p className="mt-2 font-heading text-3xl font-bold text-accent">
            {formatCdf(cashInToday)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {salesToday.length} vente{salesToday.length === 1 ? "" : "s"} enregistrée
            {salesToday.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <p className="text-xs text-muted">Encaissements sur 7 jours</p>
          <p className="mt-2 font-heading text-3xl font-bold text-primary">
            {formatCdf(cashInWeek)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {salesWeek.length} vente{salesWeek.length === 1 ? "" : "s"} sur la période
          </p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <p className="text-xs text-muted">À payer aux fournisseurs</p>
          <p className="mt-2 font-heading text-3xl font-bold text-yellow-300">
            {formatCdf(supplierPayableAmount)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {payableOrders.length} commande{payableOrders.length === 1 ? "" : "s"} encore
            à suivre
          </p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <p className="text-xs text-muted">Déjà réglé</p>
          <p className="mt-2 font-heading text-3xl font-bold text-emerald-300">
            {formatCdf(supplierSettledAmount)}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {settledSupplierOrders.length} commande
            {settledSupplierOrders.length === 1 ? "" : "s"} réceptionnée
            {settledSupplierOrders.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-primary">
                Répartition par mode de paiement
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Encaissements enregistrés sur les 7 derniers jours.
              </p>
            </div>
            <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              7 jours
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {paymentMethodBreakdown.map((entry) => (
              <div
                key={entry.method}
                className="rounded-2xl border border-border bg-surface/40 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-primary">{entry.label}</p>
                    <p className="mt-1 text-xs text-secondary">
                      {entry.count} vente{entry.count === 1 ? "" : "s"} sur 7 jours
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    {formatCdf(entry.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-primary">
                Paiements en attente
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Commandes envoyées qui demandent encore un suivi marchand.
              </p>
            </div>
            <Link
              href="/orders"
              className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-accent/30 hover:text-accent"
            >
              Voir les commandes
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface/40 px-4 py-4">
              <p className="text-xs text-muted">En attente fournisseur</p>
              <p className="mt-2 text-2xl font-heading font-semibold text-yellow-300">
                {formatCdf(pendingSupplierAmount)}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {pendingSupplierOrders.length} commande
                {pendingSupplierOrders.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/40 px-4 py-4">
              <p className="text-xs text-muted">Déjà en route</p>
              <p className="mt-2 text-2xl font-heading font-semibold text-sky-300">
                {formatCdf(movingSupplierAmount)}
              </p>
              <p className="mt-1 text-xs text-secondary">
                {movingSupplierOrders.length} commande
                {movingSupplierOrders.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {payableOrders.length > 0 ? (
              payableOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-surface/40 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary">
                          {order.supplier_name}
                        </p>
                        <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] text-secondary">
                          {getSupplierStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-secondary">
                        {order.reference} · Arrivée prévue {formatShortDate(order.eta_at)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {formatCdf(order.total_amount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface/30 px-4 py-8 text-center">
                <p className="text-sm text-primary">Aucun paiement fournisseur à suivre.</p>
                <p className="mt-1 text-xs text-secondary">
                  Les nouvelles commandes envoyées apparaîtront ici.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">
              Historique des flux
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Derniers encaissements et sorties vers les fournisseurs.
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-xs text-secondary">
            {recentFlows.length} mouvement{recentFlows.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {recentFlows.length > 0 ? (
            recentFlows.map((flow) => (
              <div
                key={flow.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        flow.kind === "incoming"
                          ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                      }`}
                    >
                      {flow.label}
                    </span>
                    <span className="text-xs text-muted">{formatFlowDate(flow.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary">{flow.title}</p>
                  <p className="mt-1 text-xs text-secondary">{flow.detail}</p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    flow.kind === "incoming" ? "text-emerald-300" : "text-yellow-300"
                  }`}
                >
                  {flow.kind === "incoming" ? "+" : "-"}
                  {formatCdf(flow.amount)}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface/30 px-4 py-8 text-center">
              <p className="text-sm text-primary">Aucun flux récent à afficher.</p>
              <p className="mt-1 text-xs text-secondary">
                Les ventes et commandes fournisseurs apparaîtront ici.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-accent/20 bg-accent/10 p-2 text-accent">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-semibold text-primary">
                Crédit marchand
              </h2>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                Bientôt disponible
              </span>
            </div>
            <p className="mt-1 text-sm text-secondary">
              La page Paiements reste d&apos;abord centrée sur les encaissements et les
              règlements fournisseurs. Les options de crédit reviendront plus tard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
