import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DataTable from "@/components/dashboard/DataTable";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "appId", label: "Application", sortable: true },
  { key: "amount", label: "Amount", sortable: true },
  { key: "purpose", label: "Purpose", sortable: false },
  { key: "status", label: "Status", sortable: true },
  { key: "appliedDate", label: "Applied", sortable: true },
  { key: "decisionDate", label: "Decision", sortable: true },
];

export default async function LoansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: loans }] = await Promise.all([
    supabase
      .from("merchant_profiles")
      .select("credit_limit, credit_used")
      .maybeSingle(),
    supabase
      .from("loan_applications")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const creditLimit = profile?.credit_limit ?? 0;
  const creditUsed = profile?.credit_used ?? 0;
  const creditAvailable = creditLimit - creditUsed;
  const activeLoans = (loans ?? []).filter((l) => l.status === "Active");

  const rows = (loans ?? []).map((l, i) => ({
    id: l.id,
    appId: `LN-${new Date(l.applied_date ?? l.created_at).getFullYear()}-${String(i + 1).padStart(3, "0")}`,
    amount: `R ${(l.amount ?? 0).toLocaleString("en-ZA")}`,
    purpose: l.purpose ?? "—",
    status: l.status,
    appliedDate: l.applied_date ?? "—",
    decisionDate: l.decision_date ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">Credit Limit</p>
          <p className="mt-1 font-heading text-2xl font-bold text-primary">
            R {creditLimit.toLocaleString("en-ZA")}
          </p>
          <p className="mt-0.5 text-xs text-secondary">Based on your trading history</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">Amount Used</p>
          <p className="mt-1 font-heading text-2xl font-bold text-accent">
            R {creditUsed.toLocaleString("en-ZA")}
          </p>
          <p className="mt-0.5 text-xs text-secondary">
            Across {activeLoans.length} active {activeLoans.length === 1 ? "loan" : "loans"}
          </p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider font-medium">Available Credit</p>
          <p className="mt-1 font-heading text-2xl font-bold text-primary">
            R {creditAvailable.toLocaleString("en-ZA")}
          </p>
          <p className="mt-0.5 text-xs text-secondary">Ready to draw down</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
            Loan Applications
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
            {rows.length} applications
          </span>
        </div>
        <button className="accent-gradient btn-shine text-background text-sm font-medium px-4 py-2 rounded-lg">
          + Apply for Loan
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-secondary text-sm">
            No loan applications yet. Apply for working capital to grow your stock.
          </p>
        </div>
      ) : (
        <DataTable columns={COLUMNS} rows={rows} pageSize={10} searchable />
      )}
    </div>
  );
}
