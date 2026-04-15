import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DataTable from "@/components/dashboard/DataTable";

export const dynamic = "force-dynamic";

const LOAN_COLUMNS = [
  { key: "appId", label: "Ref", sortable: true },
  { key: "amount", label: "Amount", sortable: true },
  { key: "purpose", label: "Purpose", sortable: false },
  { key: "status", label: "Status", sortable: true },
  { key: "appliedDate", label: "Date", sortable: true },
];

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: loans }, { data: pendingOrders }] = await Promise.all([
    supabase.from("merchant_profiles").select("credit_limit, credit_used").maybeSingle(),
    supabase.from("loan_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("total_amount, supplier_name, order_date")
      .in("status", ["Pending", "Confirmed"]).order("created_at", { ascending: false }),
  ]);

  const creditLimit = profile?.credit_limit ?? 0;
  const creditUsed = profile?.credit_used ?? 0;
  const creditAvailable = creditLimit - creditUsed;
  const usedPercent = creditLimit > 0 ? Math.round((creditUsed / creditLimit) * 100) : 0;
  const activeLoans = (loans ?? []).filter((l) => l.status === "Active");
  const pendingTotal = (pendingOrders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const rows = (loans ?? []).map((l, i) => ({
    id: l.id,
    appId: `LN-${new Date(l.applied_date ?? l.created_at).getFullYear()}-${String(i + 1).padStart(3, "0")}`,
    amount: `R ${(l.amount ?? 0).toLocaleString("en-ZA")}`,
    purpose: l.purpose ?? "\u2014",
    status: l.status,
    appliedDate: l.applied_date ?? "\u2014",
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">Wallet</h1>
        <p className="mt-1 text-sm text-secondary">Your balance, credit, and working capital.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-6">
          <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Credit Available</p>
          <p className="font-heading text-4xl font-bold text-primary">R {creditAvailable.toLocaleString("en-ZA")}</p>
          <p className="text-xs text-secondary mt-1">of R {creditLimit.toLocaleString("en-ZA")} limit</p>
          {creditLimit > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted">Used: R {creditUsed.toLocaleString("en-ZA")}</span>
                <span className="text-xs text-muted">{usedPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-bright overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usedPercent > 80 ? "bg-red-400" : usedPercent > 50 ? "bg-yellow-400" : "bg-accent"}`}
                  style={{ width: `${Math.min(usedPercent, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted">Active Loans</p>
            <p className="font-heading text-xl font-bold text-primary mt-0.5">{activeLoans.length}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted">Pending Payments</p>
            <p className={`font-heading text-xl font-bold mt-0.5 ${pendingTotal > 0 ? "text-yellow-400" : "text-primary"}`}>
              {pendingTotal > 0 ? `R ${pendingTotal.toLocaleString("en-ZA")}` : "\u2014"}
            </p>
            {pendingTotal > 0 && <p className="text-xs text-muted mt-0.5">{pendingOrders?.length} unpaid orders</p>}
          </div>
        </div>
      </div>

      {creditLimit === 0 && (
        <div className="glass-card rounded-xl p-5 border-accent/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold text-primary">Order Now, Pay Later</h3>
              <p className="text-xs text-secondary mt-1 leading-relaxed">
                Build your order history and unlock working capital. Place 5+ orders to qualify for Zando credit \u2014 restock today, pay when your goods sell.
              </p>
              <p className="mt-2 text-xs text-muted">No formal credit bureau needed. Your order history is your credit score.</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-sm font-semibold text-primary">Credit Applications</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">{rows.length}</span>
          </div>
          <button className="accent-gradient btn-shine text-background text-xs font-medium px-3 py-1.5 rounded-lg">+ Apply for Credit</button>
        </div>
        {rows.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <p className="text-secondary text-sm">No credit applications yet.</p>
            <p className="text-xs text-muted mt-1">Place more orders to unlock working capital.</p>
          </div>
        ) : (
          <DataTable columns={LOAN_COLUMNS} rows={rows} pageSize={10} searchable />
        )}
      </div>
    </div>
  );
}
