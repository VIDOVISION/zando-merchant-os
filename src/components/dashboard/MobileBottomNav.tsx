"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV_ITEMS = [
  {
    label: "Accueil",
    href: "/home",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
        />
      </svg>
    ),
  },
  {
    label: "Ventes",
    href: "/sales",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3.75h18v4.5H3v-4.5Zm0 6.75h18v9.75H3V10.5Zm4.5 3.75h4.5m-4.5 3h3"
        />
      </svg>
    ),
  },
  {
    label: "Stock",
    href: "/inventory",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
        />
      </svg>
    ),
  },
  {
    label: "Commandes",
    href: "/orders",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272"
        />
      </svg>
    ),
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/home") {
    return pathname === "/" || pathname === "/home";
  }

  if (href === "/orders") {
    return pathname.startsWith("/orders") || pathname.startsWith("/order");
  }

  return pathname.startsWith(href);
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl lg:hidden"
    >
      <div className="grid grid-cols-4 gap-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface-bright hover:text-primary"
              }`}
            >
              <span>{item.icon}</span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
