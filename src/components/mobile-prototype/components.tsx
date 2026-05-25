"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Box,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  DollarSign,
  ExternalLink,
  Store,
  LayoutGrid,
  MapPin,
  Package,
  PackageCheck,
  Search,
  SlidersHorizontal,
  Star,
  Truck,
  WalletCards,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { DeliveryItem, MobileStat, ProductLine, StatIconName, Tone } from "./mock-data";

type MobileNavId =
  | "dashboard"
  | "orders"
  | "inventory"
  | "finances"
  | "deliveries"
  | "customers"
  | "menu";

const toneStyles: Record<
  Tone,
  { text: string; bg: string; border: string; glow: string; button: string }
> = {
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-400/20",
    glow: "shadow-blue-500/20",
    button: "bg-blue-600 text-white",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-400/20",
    glow: "shadow-orange-500/20",
    button: "bg-orange-600 text-white",
  },
  green: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/20",
    glow: "shadow-emerald-500/20",
    button: "bg-emerald-600 text-white",
  },
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-400/20",
    glow: "shadow-purple-500/20",
    button: "bg-purple-600 text-white",
  },
  red: {
    text: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-400/20",
    glow: "shadow-red-500/20",
    button: "bg-red-600 text-white",
  },
  pink: {
    text: "text-fuchsia-400",
    bg: "bg-fuchsia-500/15",
    border: "border-fuchsia-400/20",
    glow: "shadow-fuchsia-500/20",
    button: "bg-fuchsia-600 text-white",
  },
};

const statIcons: Record<StatIconName, LucideIcon> = {
  "badge-check": BadgeCheck,
  box: Box,
  briefcase: BriefcaseBusiness,
  clock: Clock3,
  dollar: DollarSign,
  "package-check": PackageCheck,
  truck: Truck,
  "x-circle": XCircle,
};

function getStatusTone(status: string): Tone {
  if (status === "Pending") return "orange";
  if (status === "Confirmed" || status === "Completed") return "green";
  if (status === "In Transit") return "blue";
  if (status === "Delivered") return "purple";
  if (status === "Failed") return "red";
  if (status === "In Stock") return "green";
  if (status === "Low Stock") return "orange";
  if (status === "Out of Stock") return "red";
  if (status === "Paid") return "green";
  if (status === "Collected") return "green";
  if (status === "Pending collection") return "orange";
  if (status === "To collect") return "orange";
  if (status === "New") return "blue";
  if (status === "Active") return "green";
  if (status === "Due in 7 days") return "purple";
  return "blue";
}

function productInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "P"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function MobilePageShell({
  children,
  active,
  hideBottomNav = false,
}: {
  children: ReactNode;
  active: MobileNavId;
  hideBottomNav?: boolean;
  navVariant?: "standard" | "deliveries";
}) {
  return (
    <div className="min-h-screen bg-[#020812] text-white">
      <div
        className={`mx-auto min-h-screen w-full max-w-[480px] bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.14),transparent_30%),linear-gradient(180deg,#06111d_0%,#020812_42%,#020812_100%)] px-5 pt-6 shadow-2xl shadow-black/50 sm:max-w-[520px] ${
          hideBottomNav ? "pb-8" : "pb-36"
        }`}
      >
        {children}
      </div>
      {hideBottomNav ? null : <BottomNavigation active={active} />}
    </div>
  );
}

export function TopHeader({
  notificationCount = 0,
  onNotificationsClick,
  onProfileClick,
  showSearch = false,
}: {
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  showSearch?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/mobile-dashboard" className="font-heading text-4xl font-black italic tracking-tight text-white">
        Zando
      </Link>
      <div className="flex items-center gap-3">
        {showSearch ? (
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-300" type="button" aria-label="Search">
            <Search className="h-6 w-6" />
          </button>
        ) : null}
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-slate-300 transition hover:bg-white/5"
          type="button"
          aria-label="Notifications"
          onClick={onNotificationsClick}
        >
          <Bell className="h-6 w-6" />
          {notificationCount > 0 ? (
            <span className="absolute right-0.5 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white ring-2 ring-[#06111d]">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-label="Open profile menu"
          onClick={onProfileClick}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-orange-500 to-slate-900 text-sm font-bold transition hover:scale-[1.02]"
        >
          PS
        </button>
      </div>
    </header>
  );
}

function BottomNavigation({
  active,
}: {
  active: MobileNavId;
}) {
  const pathname = usePathname();
  const items: Array<{ id: MobileNavId; label: string; href: string; icon: LucideIcon }> = [
    { id: "dashboard", label: "Home", href: "/mobile-dashboard", icon: LayoutGrid },
    { id: "orders", label: "Orders", href: "/mobile-orders", icon: BriefcaseBusiness },
    { id: "inventory", label: "Stock", href: "/mobile-inventory", icon: Package },
    { id: "finances", label: "Money", href: "/mobile-finances", icon: WalletCards },
    { id: "deliveries", label: "Deliveries", href: "/mobile-deliveries", icon: Truck },
    { id: "customers", label: "Customers", href: "/mobile-customers", icon: Store },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="grid grid-cols-6 rounded-[1.75rem] border border-white/10 bg-[#06111d]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id || pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition-colors ${
                isActive ? "bg-blue-600/15 text-blue-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.6rem] border border-white/10 bg-white/[0.035] shadow-xl shadow-black/20 ${className}`}>
      {children}
    </section>
  );
}

export function StatCard({ stat }: { stat: MobileStat }) {
  const Icon = statIcons[stat.iconName];
  const tone = toneStyles[stat.tone];
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/20">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${tone.border} ${tone.bg} ${tone.text} shadow-lg ${tone.glow}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm leading-snug text-slate-300">{stat.label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{stat.value}</p>
      <p className={`mt-3 text-sm font-medium ${tone.text}`}>{stat.helper}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = toneStyles[getStatusTone(status)];
  return (
    <span className={`inline-flex rounded-xl border px-3 py-1.5 text-sm font-semibold ${tone.bg} ${tone.border} ${tone.text}`}>
      {status}
    </span>
  );
}

export function SearchFilterBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <label className="relative block">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.035] pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
        />
      </label>
      <button type="button" className="flex h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-medium text-slate-200">
        <SlidersHorizontal className="h-5 w-5" />
        <span className="hidden min-[390px]:inline">Filters</span>
      </button>
    </div>
  );
}

export function StatusTabs({
  tabs,
  activeIndex = 0,
  onChange,
}: {
  tabs: Array<{ label: string; count?: string }>;
  activeIndex?: number;
  onChange?: (index: number) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-max rounded-2xl border border-white/10 bg-white/[0.025] p-1">
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={`${tab.label}-${tab.count ?? ""}`}
              type="button"
              onClick={() => onChange?.(index)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count ? (
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15" : "bg-white/10 text-slate-400"}`}>
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductThumb({ product, size = "md" }: { product: ProductLine; size?: "sm" | "md" }) {
  const tone = toneStyles[product.tone ?? "blue"];
  const dimensions = size === "sm" ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl";
  return (
    <div className={`${dimensions} flex shrink-0 items-center justify-center overflow-hidden border border-white/10 ${tone.bg}`}>
      {product.image ? (
        <img src={product.image} alt="" aria-hidden="true" className="h-full w-full object-contain p-1.5" />
      ) : (
        <span className={`text-xs font-bold ${tone.text}`}>{productInitials(product.name)}</span>
      )}
    </div>
  );
}

export function ProductListItem({ product }: { product: ProductLine }) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 py-4 last:border-b-0">
      <ProductThumb product={product} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{product.name}</p>
        <p className="mt-1 text-sm text-slate-400">{product.detail}</p>
      </div>
      {product.amount ? <p className="font-semibold text-white">{product.amount}</p> : null}
    </div>
  );
}

function DriverAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-orange-400 to-slate-900 text-xs font-bold">
      {name.replace("Driver ", "").slice(0, 2).toUpperCase()}
    </div>
  );
}

function MapPreview({ status }: { status: string }) {
  const tone = toneStyles[getStatusTone(status)];
  return (
    <div className="relative h-20 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:18px_18px] opacity-50" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 120 80">
        <path d="M12 60 C32 55 33 22 53 28 S74 62 105 18" fill="none" stroke="currentColor" strokeWidth="3" className={tone.text} />
      </svg>
      <MapPin className={`absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 ${tone.text}`} />
    </div>
  );
}

export function DeliveryCard({
  delivery,
  primaryAction,
  primaryHref,
  onPrimaryAction,
  actionDisabled = false,
}: {
  delivery: DeliveryItem;
  primaryAction?: string;
  primaryHref?: string;
  onPrimaryAction?: () => void;
  actionDisabled?: boolean;
}) {
  const tone = toneStyles[getStatusTone(delivery.status)];
  const Icon: LucideIcon = delivery.status === "Pending" ? Box : delivery.status === "Completed" ? Package : delivery.status === "Failed" ? Package : Truck;
  const actionClassName = `flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${tone.button}`;

  return (
    <SectionCard className="p-4">
      <div className="grid gap-4 min-[430px]:grid-cols-[1fr_120px]">
        <div className="flex min-w-0 gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${tone.bg} ${tone.text}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">Order {delivery.id}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-300">
              <MapPin className="h-4 w-4 text-blue-400" />
              {delivery.store}
            </p>
            <p className="mt-2 text-sm text-slate-400">{delivery.items} <span className="px-1">-</span> {delivery.amount}</p>
          </div>
        </div>
        <div className="min-[430px]:hidden">
          <StatusBadge status={delivery.status} />
          <p className="mt-2 text-sm text-slate-300">{delivery.statusText}</p>
          <p className="mt-1 text-sm text-slate-400">{delivery.time}</p>
        </div>
        <div className="hidden min-[430px]:block">
          <StatusBadge status={delivery.status} />
          <p className="mt-2 text-sm text-slate-300">{delivery.statusText}</p>
          <p className="mt-1 text-sm text-slate-400">{delivery.time}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4 min-[430px]:grid-cols-[120px_1fr_auto]">
        <MapPreview status={delivery.status} />
        <div className="flex min-w-0 items-center gap-3">
          <DriverAvatar name={delivery.driver} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{delivery.driver}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-300">
              <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
              {delivery.rating}
            </p>
            {delivery.eta ? <p className="text-xs text-blue-400">ETA {delivery.eta}</p> : null}
          </div>
        </div>
        {primaryAction ? (
          primaryHref ? (
            <Link href={primaryHref} className={actionClassName}>
              {primaryAction}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={actionDisabled}
              className={`${actionClassName} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {primaryAction}
            </button>
          )
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-400" />
        )}
      </div>
    </SectionCard>
  );
}

export function LiveMapCta() {
  return (
    <SectionCard className="grid gap-4 p-4 min-[430px]:grid-cols-[1fr_auto] min-[430px]:items-center">
      <div className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-400">
          <MapPin className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Real-time Delivery Tracking</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">Track your deliveries live and get real-time updates from our delivery partners.</p>
        </div>
      </div>
      <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white" type="button">
        View Live Map <ExternalLink className="h-4 w-4" />
      </button>
    </SectionCard>
  );
}
