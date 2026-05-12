"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileOrdersProvider } from "./mobile-orders-store";

export function MobileOrdersProviderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const needsMobileOrdersProvider =
    pathname.startsWith("/mobile-orders") || pathname.startsWith("/mobile-deliveries");

  if (!needsMobileOrdersProvider) return children;

  return <MobileOrdersProvider>{children}</MobileOrdersProvider>;
}
