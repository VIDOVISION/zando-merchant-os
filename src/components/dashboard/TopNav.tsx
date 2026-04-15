"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "./Sidebar";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/home": "Home",
  "/orders": "Orders",
  "/order": "New Order",
  "/orders/new": "New Order",
  "/inventory": "Inventory",
  "/deliveries": "Deliveries",
  "/wallet": "Payments",
  "/sales": "Sales",
  "/billing": "Billing",
  "/settings": "Settings",
  "/order-summary": "Review and confirm",
  "/revenue": "Revenue",
};

interface TopNavProps {
  user: {
    email?: string;
    user_metadata?: Record<string, string>;
  };
}

export default function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { openMobile } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, handleClickOutside]);

  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const breadcrumbLabel = ROUTE_LABELS[pathname] ?? pathname.split("/").pop() ?? "Page";
  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button onClick={openMobile} className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-secondary hover:text-primary hover:bg-surface-bright transition-colors" aria-label="Open sidebar">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <span className="text-muted">Zando</span>
          <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-primary font-medium">{breadcrumbLabel}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative flex items-center justify-center w-8 h-8 rounded-lg text-secondary hover:text-primary hover:bg-surface-bright transition-colors" aria-label="Notifications">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-bright transition-colors" aria-label="User menu" aria-expanded={dropdownOpen}>
            <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">{initials}</div>
            <span className="hidden sm:block text-sm text-secondary max-w-[140px] truncate">{user.email}</span>
            <svg className={`w-3.5 h-3.5 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 py-1.5 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs text-muted truncate">{user.email}</p>
              </div>
              <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-bright transition-colors">
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Settings
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-bright transition-colors w-full text-left">
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
