import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CatalogueGrid from "@/components/catalogue/CatalogueGrid";

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: products } = await supabase
    .from("supplier_products")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
            Catalogue
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
            {(products ?? []).length} products
          </span>
        </div>
      </div>
      {(products ?? []).length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-secondary text-sm">No products in the catalogue yet.</p>
        </div>
      ) : (
        <CatalogueGrid products={products ?? []} />
      )}
    </div>
  );
}
