import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChartPlaceholder from "@/components/dashboard/ChartPlaceholder";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("total_amount, supplier_name, status, delivery_date, order_date")
    .gte("order_date", thirtyDaysAgo);

  const orders30d = recentOrders ?? [];
  const totalOrders = orders30d.length;
  const avgOrderValue =
    totalOrders > 0
      ? Math.round(
          orders30d.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) / totalOrders
        )
      : 0;

  const supplierCounts: Record<string, number> = {};
  for (const o of orders30d) {
    supplierCounts[o.supplier_name] = (supplierCounts[o.supplier_name] ?? 0) + 1;
  }
  const topSupplier =
    Object.entries(supplierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const deliveredOrders = orders30d.filter((o) => o.status === "Delivered");
  const onTimeCount = deliveredOrders.filter(
    (o) => o.delivery_date && o.order_date && o.delivery_date >= o.order_date
  ).length;
  const onTimeRate =
    deliveredOrders.length > 0
      ? Math.round((onTimeCount / deliveredOrders.length) * 100)
      : 0;

  const stats = [
    { label: "Total Orders (30d)", value: String(totalOrders) },
    {
      label: "Avg. Order Value",
      value: totalOrders > 0 ? `R ${avgOrderValue.toLocaleString("en-ZA")}` : "—",
    },
    { label: "Top Supplier", value: topSupplier },
    {
      label: "On-Time Delivery",
      value: deliveredOrders.length > 0 ? `${onTimeRate}%` : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Track your restocking patterns, supplier performance, and business growth.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wider font-medium">{stat.label}</p>
            <p className="mt-1 font-heading text-xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder
          title="Monthly Restocking Spend"
          subtitle="Total spend per month across all suppliers"
        />
        <ChartPlaceholder
          title="Order Volume by Supplier"
          subtitle="Number of orders placed per supplier this quarter"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder
          title="Top Products by Reorder Frequency"
          subtitle="Products you reorder most often in the last 90 days"
        />
        <ChartPlaceholder
          title="Credit Utilization Trend"
          subtitle="Your working capital usage over time"
        />
      </div>
    </div>
  );
}
