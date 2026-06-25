import type { Metadata } from "next";
import { CheckoutPageView } from "@/components/checkout/checkout-page-view";

export const metadata: Metadata = {
  title: "Checkout | Zuzi",
  description: "Review your cart and complete secure checkout.",
};

export default function CheckoutPage() {
  return <CheckoutPageView />;
}
