"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface OrderItem {
  id: string;
  name: string;
  supplier: string;
  quantity: number;
  unit_price: number;
}

export async function placeOrder(items: OrderItem[], deliveryAddress: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Group items by supplier — one order row per supplier
  const bySupplier = items.reduce<Record<string, OrderItem[]>>((acc, item) => {
    if (!acc[item.supplier]) acc[item.supplier] = [];
    acc[item.supplier].push(item);
    return acc;
  }, {});

  const today = new Date().toISOString().split("T")[0];
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const deliveryDateStr = deliveryDate.toISOString().split("T")[0];

  const orderRows = Object.entries(bySupplier).map(([supplier, supplierItems]) => ({
    merchant_id: user.id,
    supplier_name: supplier,
    items: supplierItems.map((i) => ({
      name: i.name,
      qty: i.quantity,
      unit_price: i.unit_price,
    })),
    total_amount: supplierItems.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    status: "Pending",
    order_date: today,
    delivery_date: deliveryDateStr,
  }));

  const { error } = await supabase.from("orders").insert(orderRows);
  if (error) throw new Error(error.message);
}
