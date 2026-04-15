import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar, { SidebarProvider } from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import { CartProvider } from "@/components/cart/CartContext";
import CartDrawer from "@/components/cart/CartDrawer";
import { MerchantDataProvider } from "@/components/merchant/MerchantDataContext";
import { deriveMerchantProfile, loadMerchantState } from "@/lib/merchant-store";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const merchantProfile = deriveMerchantProfile(
    user.user_metadata as Record<string, unknown>
  );
  const initialState = await loadMerchantState(supabase, {
    merchantId: user.id,
    profile: merchantProfile,
  });

  return (
    <SidebarProvider>
      <CartProvider>
        <MerchantDataProvider
          merchantId={user.id}
          initialState={initialState}
        >
          <div className="grid grid-cols-[auto_1fr] min-h-screen">
            <Sidebar />
            <div className="flex flex-col min-w-0">
              <TopNav
                user={{
                  email: user.email,
                  user_metadata: user.user_metadata as Record<string, string>,
                }}
              />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
          </div>
          <CartDrawer />
        </MerchantDataProvider>
      </CartProvider>
    </SidebarProvider>
  );
}
