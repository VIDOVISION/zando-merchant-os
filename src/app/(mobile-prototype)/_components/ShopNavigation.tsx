"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const shopNavItems = [
  { href: "/mobile-shop-dashboard", label: "Dashboard" },
  { href: "/mobile-shop", label: "Order Products" },
  { href: "/mobile-shop-cart", label: "Cart" },
  { href: "/mobile-role-select", label: "Role" },
];

export function ShopNavigation() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {shopNavItems.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-12 items-center justify-center rounded-2xl px-2 text-center text-[11px] font-black leading-tight transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "border border-white/10 bg-white/[0.035] text-slate-200"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
