"use client";

import { useCallback, useMemo, useRef } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/products/product-card";
import { ProductsEmptyState } from "@/components/products/products-empty-state";
import {
  ProductsFilterSidebar,
  ProductsPageFilters,
} from "@/components/products/products-filter-sidebar";
import { ProductsGridSkeleton } from "@/components/products/products-grid-skeleton";
import { ProductsPagination } from "@/components/products/products-pagination";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useFilteredProducts } from "@/hooks/useProducts";
import { ProductFilters, ProductSort } from "@/types/product";

const PRODUCTS_LIMIT = 24;
const DEFAULT_SORT: ProductSort = "popular";
const SORT_VALUES = new Set<string>([
  "popular",
  "latest",
  "price_low",
  "price_high",
]);

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

const getOptionalNumberParam = (params: URLSearchParams, key: string) => {
  const rawValue = params.get(key);
  if (!rawValue) return undefined;

  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const getSortParam = (params: URLSearchParams): ProductSort => {
  const sort = params.get("sort");
  return sort && SORT_VALUES.has(sort) ? (sort as ProductSort) : DEFAULT_SORT;
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

const appendNumberParam = (
  params: URLSearchParams,
  key: string,
  value: number | undefined,
) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    params.set(key, String(value));
  }
};

const buildProductFiltersFromParams = (
  searchParamString: string,
): ProductFilters => {
  const params = new URLSearchParams(searchParamString);

  return {
    page: getPositiveIntegerParam(params, "page", 1),
    limit: PRODUCTS_LIMIT,
    category: getStringParam(params, "category"),
    subCategory: getStringParam(params, "subCategory"),
    brand: getStringParam(params, "brand"),
    minPrice: getOptionalNumberParam(params, "minPrice"),
    maxPrice: getOptionalNumberParam(params, "maxPrice"),
    rating: getOptionalNumberParam(params, "rating"),
    color: getStringParam(params, "color"),
    size: getStringParam(params, "size"),
    sort: getSortParam(params),
  };
};

const getActiveFilterCount = (filters: ProductFilters) => {
  return [
    filters.category,
    filters.subCategory,
    filters.brand,
    filters.minPrice,
    filters.maxPrice,
    filters.rating,
    filters.color,
    filters.size,
    filters.sort && filters.sort !== DEFAULT_SORT ? filters.sort : undefined,
  ].filter(Boolean).length;
};

export function ProductsPageView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const productListRef = useRef<HTMLDivElement>(null);
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();

  const filters = useMemo(
    () => buildProductFiltersFromParams(searchParamString),
    [searchParamString],
  );

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useFilteredProducts(filters);

  const products = data?.products || [];
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
    (nextFilters: ProductsPageFilters) => {
      const nextParams = new URLSearchParams();

      appendStringParam(nextParams, "category", nextFilters.category);
      appendStringParam(nextParams, "subCategory", nextFilters.subCategory);
      appendStringParam(nextParams, "brand", nextFilters.brand);
      appendNumberParam(nextParams, "minPrice", nextFilters.minPrice);
      appendNumberParam(nextParams, "maxPrice", nextFilters.maxPrice);
      appendNumberParam(nextParams, "rating", nextFilters.rating);
      appendStringParam(nextParams, "color", nextFilters.color);
      appendStringParam(nextParams, "size", nextFilters.size);

      if (nextFilters.sort && nextFilters.sort !== DEFAULT_SORT) {
        nextParams.set("sort", nextFilters.sort);
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
        productListRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [pushSearchParams, searchParamString],
  );

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ProductsFilterSidebar
        currentFilters={filters}
        activeFilterCount={activeFilterCount}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <section ref={productListRef} className="min-w-0 scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Marketplace products
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {pagination
                ? `${pagination.total} products found`
                : "Finding products"}
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
              Unable to load products
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

        {!isLoading && !isError && products.length === 0 ? (
          <ProductsEmptyState onClearFilters={handleClearFilters} />
        ) : null}

        {!isLoading && !isError && products.length > 0 ? (
          <>
            <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
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
