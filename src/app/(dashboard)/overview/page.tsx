import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MetricCard from "@/components/dashboard/MetricCard";
import ChartPlaceholder from "@/components/dashboard/ChartPlaceholder";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const [
    { count: activeCount },
    { data: monthOrders },
    { data: profile },
    { count: deliveryCount },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["Pending", "In Transit", "Out for Delivery"]),
    supabase
      .from("orders")
      .select("total_amount")
      .gte("order_date", firstOfMonth),
    supabase
      .from("merchant_profiles")
      .select("credit_limit, credit_used")
      .maybeSingle(),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("delivery_date", today)
      .in("status", ["In Transit", "Out for Delivery"]),
  ]);

  const monthlySpend =
    monthOrders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
  const creditLimit = profile?.credit_limit ?? 0;
  const creditUsed = profile?.credit_used ?? 0;
  const creditAvailable = creditLimit - creditUsed;

  const greeting = `Welcome back, ${user.email?.split("@")[0] ?? "merchant"}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Here is your store at a glance today.
        </p>
      </div>

      <div className="dashboard-grid">
        <MetricCard
          title="Active Orders"
          value={String(activeCount ?? 0)}
          change="orders in progress"
          changeType="positive"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          }
        />
        <MetricCard
          title="Monthly Spend"
          value={`R ${monthlySpend.toLocaleString("en-ZA")}`}
          change="this month"
          changeType="positive"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
        />
        <MetricCard
          title="Credit Available"
          value={`R ${creditAvailable.toLocaleString("en-ZA")}`}
          change={creditLimit > 0 ? `of R ${creditLimit.toLocaleString("en-ZA")} limit` : "No credit set up"}
          changeType="neutral"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
          }
        />
        <MetricCard
          title="Pending Deliveries"
          value={String(deliveryCount ?? 0)}
          change="expected today"
          changeType="neutral"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder
          title="Restocking Spend"
          subtitle="Monthly spend with suppliers over the last 6 months"
        />
        <ChartPlaceholder
          title="Order Volume"
          subtitle="Number of reorders placed per week"
        />
      </div>
    </div>
  );
}
