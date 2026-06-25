"use client";

import { useCallback, useMemo, useRef } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductsPagination } from "@/components/products/products-pagination";
import { ShopCard } from "@/components/shops/shop-card";
import { ShopsEmptyState } from "@/components/shops/shops-empty-state";
import {
  ShopsFilterSidebar,
  ShopsPageFilters,
} from "@/components/shops/shops-filter-sidebar";
import { ShopsGridSkeleton } from "@/components/shops/shops-grid-skeleton";
import { useShops } from "@/hooks/useShops";
import { ShopFilters } from "@/types/shop";

const SHOPS_LIMIT = 24;

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

const buildShopFiltersFromParams = (
  searchParamString: string,
): ShopFilters => {
  const params = new URLSearchParams(searchParamString);

  return {
    page: getPositiveIntegerParam(params, "page", 1),
    limit: SHOPS_LIMIT,
    category: getStringParam(params, "category"),
    q: getStringParam(params, "q"),
  };
};

const getActiveFilterCount = (filters: ShopFilters) => {
  return [filters.category, filters.q].filter(Boolean).length;
};

export function ShopsPageView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const shopListRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(
    () => buildShopFiltersFromParams(searchParamString),
    [searchParamString],
  );

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useShops(filters);

  const shops = data?.shops || [];
  const pagination = data?.pagination;
  const activeFilterCount = getActiveFilterCount(filters);

  const pushSearchParams = useCallback(
    (nextParams: URLSearchParams) => {
      const query = nextParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  const handleApplyFilters = useCallback(
    (nextFilters: ShopsPageFilters) => {
      const nextParams = new URLSearchParams();

      appendStringParam(nextParams, "category", nextFilters.category);
      appendStringParam(nextParams, "q", nextFilters.q);

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
        shopListRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [pushSearchParams, searchParamString],
  );

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ShopsFilterSidebar
        currentFilters={filters}
        activeFilterCount={activeFilterCount}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <section ref={shopListRef} className="min-w-0 scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Marketplace shops
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {pagination ? `${pagination.total} shops found` : "Finding shops"}
            </p>
          </div>

          {isFetching && !isLoading ? (
            <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Updating
            </span>
          ) : null}
        </div>

        {isLoading ? <ShopsGridSkeleton count={9} /> : null}

        {isError ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              Unable to load shops
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

        {!isLoading && !isError && shops.length === 0 ? (
          <ShopsEmptyState onClearFilters={handleClearFilters} />
        ) : null}

        {!isLoading && !isError && shops.length > 0 ? (
          <>
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
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
