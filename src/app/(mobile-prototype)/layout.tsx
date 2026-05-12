import type { ReactNode } from "react";
import { MobileOrdersProviderShell } from "./_store/mobile-orders-provider-shell";

export default function MobilePrototypeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MobileOrdersProviderShell>{children}</MobileOrdersProviderShell>;
}
