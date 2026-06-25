import { Suspense } from "react";
import type { Metadata } from "next";
import { OffersPageView } from "@/components/products/offers-page-view";
import { ProductsGridSkeleton } from "@/components/products/products-grid-skeleton";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export const metadata: Metadata = {
  title: "Offers | Zuzi",
  description:
    "Browse active deals, limited-time offers, and discounted marketplace products on Zuzi.",
};

function OffersPageFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:block">
        <div className="h-5 w-24 animate-pulse rounded-full bg-stone-200" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <ProductsGridSkeleton count={12} />
      </div>
    </div>
  );
}

export default function OffersPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Offers" },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-extrabold tracking-normal text-gray-900 sm:text-4xl">
            Offers
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
            Discover active deals and limited-time marketplace offers.
          </p>
        </div>

        <Suspense fallback={<OffersPageFallback />}>
          <OffersPageView />
        </Suspense>
      </div>
    </main>
  );
}
