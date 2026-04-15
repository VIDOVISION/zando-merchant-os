"use client";

import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
}

export default function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
}: MetricCardProps) {
  const changeColors: Record<string, string> = {
    positive: "text-success bg-success/10 border-success/20",
    negative: "text-danger bg-danger/10 border-danger/20",
    neutral: "text-secondary bg-surface-bright border-border",
  };

  return (
    <div className="glass-card card-glow rounded-xl p-5 transition-all duration-300 hover:border-border-bright">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 text-accent">
          {icon}
        </div>
        {change && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${changeColors[changeType]}`}
          >
            {changeType === "positive" && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            )}
            {changeType === "negative" && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            )}
            {change}
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-bold tracking-tight text-primary">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{title}</p>
    </div>
  );
}
