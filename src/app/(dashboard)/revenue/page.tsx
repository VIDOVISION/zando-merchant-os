import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RevenueCharts from "@/components/dashboard/RevenueCharts";
import type { MrrDataPoint, PaymentDataPoint, PlanDistribution } from "@/components/dashboard/RevenueCharts";

export const dynamic = "force-dynamic";

const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  growth: 29900,  // cents
  pro: 79900,
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

function formatRands(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA")}`;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleString("en-ZA", { month: "short" });
}

export default async function RevenuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all data in parallel
  const [
    { data: allProfiles },
    { data: stripeEvents },
    { data: planChanges },
  ] = await Promise.all([
    supabase.from("merchant_profiles").select("id, plan, created_at"),
    supabase.from("stripe_events").select("event_type, amount_cents, status, plan, created_at").order("created_at", { ascending: true }),
    supabase.from("plan_changes").select("merchant_id, old_plan, new_plan, changed_at").order("changed_at", { ascending: false }).limit(20),
  ]);

  // ── Plan distribution (current) ──────────────────────────
  const planCounts: Record<string, number> = { starter: 0, growth: 0, pro: 0 };
  for (const p of allProfiles ?? []) {
    const plan = p.plan ?? "starter";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
  }
  const totalMerchants = (allProfiles ?? []).length;
  const paidMerchants = (planCounts.growth ?? 0) + (planCounts.pro ?? 0);

  const planDistribution: PlanDistribution[] = [
    { name: "Starter (Free)", value: planCounts.starter ?? 0, color: "#525252" },
    { name: "Growth (R299)", value: planCounts.growth ?? 0, color: "#00C853" },
    { name: "Pro (R799)", value: planCounts.pro ?? 0, color: "#60A5FA" },
  ];

  // ── Current MRR ──────────────────────────────────────────
  const currentMrrCents =
    (planCounts.growth ?? 0) * PLAN_PRICES.growth +
    (planCounts.pro ?? 0) * PLAN_PRICES.pro;

  // ── Stripe events analytics ───────────────────────────────
  const events = stripeEvents ?? [];
  const succeeded = events.filter((e) => e.status === "succeeded");
  const failed = events.filter((e) => e.status === "failed");
  const successRate = events.length > 0 ? Math.round((succeeded.length / events.length) * 100) : 0;
  const totalRevenueCents = succeeded.reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const avgRevPerMerchant = totalMerchants > 0 ? Math.round(currentMrrCents / (totalMerchants || 1)) : 0;

  // ── Build 6-month trend ───────────────────────────────────
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({ label: getMonthLabel(d), start: d, end });
  }

  // MRR trend: use stripe events (succeeded) grouped by month + plan
  const mrrTrend: MrrDataPoint[] = months.map(({ label, start, end }) => {
    const monthEvents = succeeded.filter((e) => {
      const d = new Date(e.created_at);
      return d >= start && d <= end;
    });
    const starterMrr = 0; // starter is free
    const growthMrr = monthEvents
      .filter((e) => e.plan === "growth")
      .reduce((s, e) => s + (e.amount_cents ?? 0), 0);
    const proMrr = monthEvents
      .filter((e) => e.plan === "pro")
      .reduce((s, e) => s + (e.amount_cents ?? 0), 0);
    return { month: label, starter: starterMrr, growth: growthMrr, pro: proMrr, total: growthMrr + proMrr };
  });

  // Payment trend
  const paymentTrend: PaymentDataPoint[] = months.map(({ label, start, end }) => {
    const monthEvents = events.filter((e) => {
      const d = new Date(e.created_at);
      return d >= start && d <= end;
    });
    return {
      month: label,
      succeeded: monthEvents.filter((e) => e.status === "succeeded").length,
      failed: monthEvents.filter((e) => e.status === "failed").length,
    };
  });

  // ── Churn: plan_changes where new_plan = 'starter' (downgrade) ───
  const churnEvents = (planChanges ?? []).filter(
    (c) => c.new_plan === "starter" && c.old_plan !== "starter"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">Revenue</h1>
        <p className="mt-1 text-sm text-secondary">
          Subscription economics, payment analytics, and plan insights.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* MRR */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Monthly Recurring Revenue</p>
          <p className="font-heading text-2xl font-bold text-accent">
            {formatRands(currentMrrCents)}
          </p>
          <p className="text-[11px] text-muted mt-1.5">
            {paidMerchants} paying merchant{paidMerchants !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Active Subscribers */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Active Subscribers</p>
          <p className="font-heading text-2xl font-bold text-primary">{paidMerchants}</p>
          <p className="text-[11px] text-muted mt-1.5">
            of {totalMerchants} total merchants
          </p>
        </div>

        {/* Payment Success Rate */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Payment Success Rate</p>
          <p className={`font-heading text-2xl font-bold ${successRate >= 90 ? "text-success" : successRate >= 70 ? "text-yellow-400" : "text-danger"}`}>
            {successRate}%
          </p>
          <p className="text-[11px] text-muted mt-1.5">
            {succeeded.length} succeeded · {failed.length} failed
          </p>
        </div>

        {/* Avg Revenue per Merchant */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Avg Rev / Merchant</p>
          <p className="font-heading text-2xl font-bold text-primary">
            {formatRands(avgRevPerMerchant)}
          </p>
          <p className="text-[11px] text-muted mt-1.5">per month (MRR basis)</p>
        </div>
      </div>

      {/* Charts */}
      <RevenueCharts
        mrrTrend={mrrTrend}
        paymentTrend={paymentTrend}
        planDistribution={planDistribution}
      />

      {/* Plan Breakdown Table */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-heading text-sm font-semibold text-primary mb-4">Plan Tier Breakdown</h2>
        <div className="space-y-3">
          {["starter", "growth", "pro"].map((plan) => {
            const count = planCounts[plan] ?? 0;
            const mrr = count * PLAN_PRICES[plan];
            const pct = totalMerchants > 0 ? Math.round((count / totalMerchants) * 100) : 0;
            const colors: Record<string, string> = {
              starter: "bg-secondary",
              growth: "bg-accent",
              pro: "bg-blue-400",
            };
            return (
              <div key={plan} className="flex items-center gap-4">
                <div className="w-20 flex-shrink-0">
                  <span className="text-xs font-medium text-primary capitalize">{PLAN_LABELS[plan]}</span>
                </div>
                <div className="flex-1 h-2 bg-surface-bright rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors[plan]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-8 text-right">
                  <span className="text-xs text-secondary">{count}</span>
                </div>
                <div className="w-24 text-right">
                  <span className="text-xs text-secondary">
                    {mrr > 0 ? formatRands(mrr) + "/mo" : "Free"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Change Activity */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm font-semibold text-primary">Plan Change Activity</h2>
          <span className="text-xs text-muted">
            {churnEvents.length > 0 ? `${churnEvents.length} churn event${churnEvents.length > 1 ? "s" : ""}` : "No churn"}
          </span>
        </div>
        {(planChanges ?? []).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted">No plan changes yet.</p>
            <p className="text-[11px] text-muted mt-1">Upgrades and downgrades will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(planChanges ?? []).map((change, i) => {
              const isUpgrade =
                PLAN_PRICES[change.new_plan] > PLAN_PRICES[change.old_plan ?? "starter"];
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isUpgrade ? "bg-success" : "bg-danger"
                      }`}
                    />
                    <span className="text-xs text-secondary">
                      {PLAN_LABELS[change.old_plan ?? "starter"]} →{" "}
                      {PLAN_LABELS[change.new_plan]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                        isUpgrade
                          ? "text-success bg-success/10 border-success/20"
                          : "text-danger bg-danger/10 border-danger/20"
                      }`}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </span>
                    <span className="text-[11px] text-muted">
                      {new Date(change.changed_at).toLocaleDateString("en-ZA")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
