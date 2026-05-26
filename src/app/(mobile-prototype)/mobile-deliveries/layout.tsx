"use client";

import type { ReactNode } from "react";

import { MobileOrdersProvider } from "../_store/mobile-orders-store";

export default function MobileDeliveriesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MobileOrdersProvider>{children}</MobileOrdersProvider>;
}
