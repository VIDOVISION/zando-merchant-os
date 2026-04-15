import { CheckoutButton } from "@/components/CheckoutButton";

/* ─── Types ─── */

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  priceId: string;
  features: PlanFeature[];
  popular?: boolean;
}

interface PricingCardsProps {
  plans: Plan[];
  currentPlanName?: string;
}

/* ─── PricingCards Component ─── */

export default function PricingCards({
  plans,
  currentPlanName,
}: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isCurrent = currentPlanName === plan.name;
        const isPopular = plan.popular === true;

        return (
          <div
            key={plan.name}
            className={`relative glass-card card-glow rounded-xl p-6 transition-all duration-300 hover:border-border-bright ${
              isPopular ? "border-accent/30 ring-1 ring-accent/10" : ""
            }`}
          >
            {/* Popular badge */}
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider accent-gradient text-background">
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan header */}
            <div className="mb-6">
              <h3 className="font-heading text-lg font-semibold text-primary">
                {plan.name}
              </h3>
              <p className="mt-1 text-xs text-muted">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold tracking-tight text-primary">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-muted">/{plan.period}</span>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2.5 mb-6">
              {plan.features.map((feature) => (
                <li
                  key={feature.text}
                  className="flex items-start gap-2.5 text-sm"
                >
                  {feature.included ? (
                    <svg
                      className="w-4 h-4 text-accent mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-muted/40 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  <span
                    className={
                      feature.included ? "text-secondary" : "text-muted/60"
                    }
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-auto">
              {isCurrent ? (
                <div className="flex items-center justify-center py-2.5 rounded-lg border border-accent/20 bg-accent/5">
                  <span className="text-sm font-medium text-accent">
                    Current Plan
                  </span>
                </div>
              ) : plan.priceId ? (
                <CheckoutButton
                  priceId={plan.priceId}
                  label={plan.price === "$0" ? "Get Started" : "Upgrade"}
                />
              ) : (
                <button className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-secondary hover:text-primary hover:border-border-bright transition-colors">
                  Contact Sales
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
