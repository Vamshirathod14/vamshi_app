// Subscription plan catalogue. Prices are configurable here — never hardcoded
// in controllers or components. `amountPaise` is what the payment provider
// actually charges (₹99 = 9900 paise).
export const PLANS = {
  premium: {
    id: "vamshi-premium",
    name: "Vamshi Premium",
    tagline: "Everything in Vamshi, unlocked.",
    price: 99,
    currency: "INR",
    amountPaise: 9900,
    billingPeriod: "monthly",
    intervalDays: 31,
  },
};

export const DEFAULT_PLAN_ID = "premium";

export function getPlan(id = DEFAULT_PLAN_ID) {
  return PLANS[id] || PLANS[DEFAULT_PLAN_ID];
}

export function planOption() {
  return {
    id: getPlan().id,
    name: getPlan().name,
    price: getPlan().price,
    currency: getPlan().currency,
    billingPeriod: getPlan().billingPeriod,
    amountPaise: getPlan().amountPaise,
  };
}