import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PricingCards from "@/components/billing/PricingCards";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    name: "Basic",
    price: "Free",
    period: "mo",
    description: "For merchants just getting started.",
    priceId: "",
    popular: false,
    features: [
      { text: "Browse supplier catalogue", included: true },
      { text: "Up to 5 reorders per month", included: true },
      { text: "Basic order tracking", included: true },
      { text: "Email support", included: true },
      { text: "Delivery scheduling", included: false },
      { text: "Working capital access", included: false },
    ],
  },
  {
    name: "Growth",
    price: "R 299",
    period: "mo",
    description: "For growing merchants who restock regularly.",
    priceId: "price_PLACEHOLDER_GROWTH",
    popular: true,
    features: [
      { text: "Unlimited reorders", included: true },
      { text: "Priority delivery scheduling", included: true },
      { text: "Real-time order tracking", included: true },
      { text: "Up to R 10,000 credit line", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    name: "Pro",
    price: "R 799",
    period: "mo",
    description: "For established merchants scaling fast.",
    priceId: "price_PLACEHOLDER_PRO",
    popular: false,
    features: [
      { text: "Everything in Growth", included: true },
      { text: "Up to R 50,000 credit line", included: true },
      { text: "Same-day delivery options", included: true },
      { text: "Advanced analytics & reports", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "API access for integrations", included: true },
    ],
  },
];

const PLAN_MAP: Record<string, string> = {
  starter: "Basic",
  growth: "Growth",
  pro: "Pro",
  Basic: "Basic",
  Growth: "Growth",
  Pro: "Pro",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("merchant_profiles")
    .select("plan")
    .maybeSingle();

  const currentPlanName = PLAN_MAP[profile?.plan ?? "starter"] ?? "Basic";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          Billing
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Manage your Zando subscription and unlock more features.
        </p>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider font-medium">
            Current plan
          </p>
          <p className="mt-1 font-heading text-lg font-semibold text-primary">
            {currentPlanName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
            Active
          </span>
        </div>
      </div>

      <PricingCards
        plans={PLANS}
        currentPlanName={currentPlanName}
      />
    </div>
  );
}
