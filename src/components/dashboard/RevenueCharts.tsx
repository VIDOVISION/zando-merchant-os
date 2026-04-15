"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export interface MrrDataPoint {
  month: string;
  starter: number;
  growth: number;
  pro: number;
  total: number;
}

export interface PaymentDataPoint {
  month: string;
  succeeded: number;
  failed: number;
}

export interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

interface RevenueChartsProps {
  mrrTrend: MrrDataPoint[];
  paymentTrend: PaymentDataPoint[];
  planDistribution: PlanDistribution[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#0F0F0F",
  border: "1px solid #1F1F1F",
  borderRadius: "8px",
  color: "#EDEDED",
  fontSize: "12px",
};

const CURSOR_STYLE = { fill: "rgba(0,200,83,0.04)" };

export default function RevenueCharts({
  mrrTrend,
  paymentTrend,
  planDistribution,
}: RevenueChartsProps) {
  return (
    <div className="space-y-6">
      {/* MRR Trend */}
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h2 className="font-heading text-sm font-semibold text-primary">MRR by Plan Tier</h2>
          <p className="text-xs text-muted mt-0.5">Monthly recurring revenue breakdown — last 6 months</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={mrrTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradStarter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A1A1A1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#A1A1A1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C853" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#525252", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#525252", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/100).toFixed(0)}`} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "#A1A1A1", marginBottom: 4 }}
              cursor={CURSOR_STYLE}
              formatter={(v: unknown, name: unknown) => [`R ${(Number(v)/100).toFixed(0)}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)] as [string, string]}
            />
            <Area type="monotone" dataKey="starter" stackId="1" stroke="#A1A1A1" strokeWidth={1.5} fill="url(#gradStarter)" />
            <Area type="monotone" dataKey="growth" stackId="1" stroke="#00C853" strokeWidth={1.5} fill="url(#gradGrowth)" />
            <Area type="monotone" dataKey="pro" stackId="1" stroke="#60A5FA" strokeWidth={1.5} fill="url(#gradPro)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 justify-end">
          <span className="flex items-center gap-1.5 text-[11px] text-secondary"><span className="w-3 h-0.5 bg-secondary rounded" />Starter (Free)</span>
          <span className="flex items-center gap-1.5 text-[11px] text-secondary"><span className="w-3 h-0.5 bg-accent rounded" />Growth (R299)</span>
          <span className="flex items-center gap-1.5 text-[11px] text-secondary"><span className="w-3 h-0.5 bg-blue-400 rounded" />Pro (R799)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Success Rate */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-heading text-sm font-semibold text-primary">Payment Success vs Failures</h2>
            <p className="text-xs text-muted mt-0.5">Checkout attempts by outcome — last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={paymentTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#525252", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#525252", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE} />
              <Bar dataKey="succeeded" name="Succeeded" fill="#00C853" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution Pie */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-heading text-sm font-semibold text-primary">Active Subscribers by Plan</h2>
            <p className="text-xs text-muted mt-0.5">Current plan distribution across all merchants</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown, name: unknown) => [Number(v), String(name)] as [number, string]} />
              <Legend
                formatter={(value) => <span style={{ color: "#A1A1A1", fontSize: 11 }}>{value}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
