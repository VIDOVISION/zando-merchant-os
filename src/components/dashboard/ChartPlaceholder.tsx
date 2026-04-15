"use client";

/* PLACEHOLDER — Replace with Recharts, Chart.js, or your preferred charting library */

interface ChartPlaceholderProps {
  title: string;
  subtitle?: string;
}

/* PLACEHOLDER — Adjust bar heights to match your real data range */
const BAR_HEIGHTS = [35, 55, 45, 70, 60, 80, 50, 90, 65, 75, 40, 85];

export default function ChartPlaceholder({
  title,
  subtitle,
}: ChartPlaceholderProps) {
  return (
    <div className="glass-card card-glow rounded-xl p-6 transition-all duration-300 hover:border-border-bright">
      <div className="mb-6">
        <h3 className="font-heading text-base font-semibold text-primary">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        )}
      </div>

      {/* Animated bar chart skeleton */}
      <div className="flex items-end gap-2 h-48">
        {BAR_HEIGHTS.map((height, i) => (
          <div key={i} className="flex-1 flex items-end h-full">
            <div
              className="skeleton-bar w-full"
              style={{
                height: `${height}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels skeleton */}
      <div className="flex gap-2 mt-3">
        {BAR_HEIGHTS.map((_, i) => (
          <div key={i} className="flex-1">
            <div className="h-2 rounded bg-border/50 mx-auto w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
