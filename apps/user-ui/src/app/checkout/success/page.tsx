import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { CheckoutSuccessView } from "@/components/checkout/checkout-success-view";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export const metadata: Metadata = {
  title: "Checkout Success | Zuzi",
  description: "Verify your payment and order status.",
};

function CheckoutSuccessFallback() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
        Loading checkout status
      </h1>
    </section>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-stone-50 py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Checkout", href: "/checkout" },
            { label: "Success" },
          ]}
        />

        <div className="mt-8">
          <Suspense fallback={<CheckoutSuccessFallback />}>
            <CheckoutSuccessView />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
