"use client";

import { useCallback, useMemo, useRef } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OffersEmptyState } from "@/components/products/offers-empty-state";
import {
  OffersFilterSidebar,
  OffersPageFilters,
  OfferStatusFilter,
} from "@/components/products/offers-filter-sidebar";
import { ProductCard } from "@/components/products/product-card";
import { ProductsGridSkeleton } from "@/components/products/products-grid-skeleton";
import { ProductsPagination } from "@/components/products/products-pagination";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useEventProducts } from "@/hooks/useProducts";
import { EventProductsParams } from "@/types/product";

const OFFERS_LIMIT = 24;
const DEFAULT_STATUS: OfferStatusFilter = "all";
const OFFER_STATUSES = new Set<string>([
  "all",
  "active",
  "upcoming",
  "ended",
  "expired",
]);

const offerStatusCopy: Record<
  OfferStatusFilter,
  { title: string; description: string }
> = {
  all: {
    title: "Current and upcoming offers",
    description: "Active offers and upcoming event deals from sellers.",
  },
  active: {
    title: "Active offers",
    description: "Live event offers. Event prices may be active now.",
  },
  upcoming: {
    title: "Upcoming offers",
    description: "Events starting soon. Current prices remain normal until then.",
  },
  ended: {
    title: "Ended offers",
    description: "Past event offers are shown for reference.",
  },
};

const getStringParam = (params: URLSearchParams, key: string) => {
  const value = params.get(key)?.trim();
  return value || undefined;
};

const getPositiveIntegerParam = (
  params: URLSearchParams,
  key: string,
  fallback: number,
) => {
  const value = Number(params.get(key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const getStatusParam = (params: URLSearchParams): OfferStatusFilter => {
  const status = params.get("status");

  if (status === "expired") return "ended";

  return status && OFFER_STATUSES.has(status)
    ? (status as OfferStatusFilter)
    : DEFAULT_STATUS;
};

const appendStringParam = (
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) => {
  const cleaned = value?.trim();
  if (cleaned) {
    params.set(key, cleaned);
  }
};

const buildOfferFiltersFromParams = (
  searchParamString: string,
): EventProductsParams & { status: OfferStatusFilter } => {
  const params = new URLSearchParams(searchParamString);

  return {
    page: getPositiveIntegerParam(params, "page", 1),
    limit: OFFERS_LIMIT,
    category: getStringParam(params, "category"),
    subCategory: getStringParam(params, "subCategory"),
    status: getStatusParam(params),
  };
};

const getActiveFilterCount = (
  filters: EventProductsParams & { status: OfferStatusFilter },
) => {
  return [
    filters.category,
    filters.subCategory,
    filters.status !== DEFAULT_STATUS ? filters.status : undefined,
  ].filter(Boolean).length;
};

export function OffersPageView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const offerListRef = useRef<HTMLDivElement>(null);
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();

  const filters = useMemo(
    () => buildOfferFiltersFromParams(searchParamString),
    [searchParamString],
  );

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useEventProducts(filters);

  const offers = data?.products || [];
  const pagination = data?.pagination;
  const activeFilterCount = getActiveFilterCount(filters);
  const statusCopy = offerStatusCopy[filters.status];

  const pushSearchParams = useCallback(
    (nextParams: URLSearchParams) => {
      const query = nextParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  const handleApplyFilters = useCallback(
    (nextFilters: OffersPageFilters) => {
      const nextParams = new URLSearchParams();

      appendStringParam(nextParams, "category", nextFilters.category);
      appendStringParam(nextParams, "subCategory", nextFilters.subCategory);

      if (nextFilters.status !== DEFAULT_STATUS) {
        nextParams.set("status", nextFilters.status);
      }

      pushSearchParams(nextParams);
    },
    [pushSearchParams],
  );

  const handleClearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const handlePageChange = useCallback(
    (page: number) => {
      const nextParams = new URLSearchParams(searchParamString);

      if (page > 1) {
        nextParams.set("page", String(page));
      } else {
        nextParams.delete("page");
      }

      pushSearchParams(nextParams);

      window.requestAnimationFrame(() => {
        offerListRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [pushSearchParams, searchParamString],
  );

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <OffersFilterSidebar
        currentFilters={filters}
        activeFilterCount={activeFilterCount}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <section ref={offerListRef} className="min-w-0 scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {statusCopy.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {pagination
                ? `${pagination.total} offers found - ${statusCopy.description}`
                : statusCopy.description}
            </p>
          </div>

          {isFetching && !isLoading ? (
            <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Updating
            </span>
          ) : null}
        </div>

        {isLoading ? <ProductsGridSkeleton count={12} /> : null}

        {isError ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              Unable to load offers
            </h3>
            <p className="mt-2 text-sm text-gray-600">Please try again.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {isFetching ? "Trying again..." : "Retry"}
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && offers.length === 0 ? (
          <OffersEmptyState
            status={filters.status}
            onClearFilters={handleClearFilters}
          />
        ) : null}

        {!isLoading && !isError && offers.length > 0 ? (
          <>
            <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {offers.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  user={fetchUser.data}
                  location={location}
                  deviceInfo={deviceInfo}
                />
              ))}
            </div>

            <ProductsPagination
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
