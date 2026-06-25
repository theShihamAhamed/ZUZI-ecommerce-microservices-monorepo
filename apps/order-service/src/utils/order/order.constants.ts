import Stripe from "stripe";

export const PAYMENT_SESSION_TTL_SECONDS = 10 * 60;
export const CURRENCY = "usd";

// Stripe payment intents in these states can safely reuse the same checkout session.
export const REUSABLE_PAYMENT_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
]);
