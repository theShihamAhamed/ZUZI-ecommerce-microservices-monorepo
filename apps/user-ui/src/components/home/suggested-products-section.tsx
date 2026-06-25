"use client";

import { ProductCard } from "@/components/products/product-card";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useRecommendedProducts } from "@/hooks/useRecommendations";

const skeletonItems = Array.from({ length: 12 }, (_, index) => index);

export function SuggestedProductsSection() {
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();
  const {
    products,
    isLoading,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecommendedProducts(12);

  return (
    <section className="bg-stone-50 pb-16 sm:pb-20 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">
              Marketplace picks
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Suggested Products
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Fresh finds from trusted marketplace sellers, tailored when your
              activity is available.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
            {skeletonItems.map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
              >
                <div className="aspect-square animate-pulse bg-stone-200" />
                <div className="space-y-2.5 p-3">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
                  <div className="h-4 w-full animate-pulse rounded-full bg-stone-200" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-200" />
                  <div className="h-4 w-28 animate-pulse rounded-full bg-stone-200" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">
              Suggested products are unavailable
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              We could not load marketplace picks right now.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {isFetching ? "Trying again..." : "Try again"}
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">
              No suggested products yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              New finds from trusted sellers will appear here soon.
            </p>
          </div>
        ) : null}

        {!isLoading && !isError && products.length > 0 ? (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  user={fetchUser.data}
                  location={location}
                  deviceInfo={deviceInfo}
                />
              ))}
            </div>

            {hasNextPage ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-amber-300 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFetchingNextPage ? "Loading..." : "Load More"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
