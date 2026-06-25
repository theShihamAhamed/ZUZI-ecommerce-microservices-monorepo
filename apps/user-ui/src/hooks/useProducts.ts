"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getEventProductsApi,
  getFilteredProductsApi,
  getProductsApi,
  getTopShopsApi,
  searchProductsApi,
} from "@/services/product.api";
import {
  EventProductsParams,
  ProductFilters,
  SearchProductsParams,
  TopShopsParams,
} from "@/types/product";

interface UseProductsParams
  extends Pick<
    ProductFilters,
    | "page"
    | "limit"
    | "category"
    | "subCategory"
    | "excludeSlug"
    | "excludeProductId"
  > {
  type?: string;
}

export const useProducts = ({
  page = 1,
  limit = 12,
  type = "suggested",
  category,
  subCategory,
  excludeSlug,
  excludeProductId,
}: UseProductsParams = {}) => {
  return useQuery({
    queryKey: [
      "products",
      page,
      limit,
      type,
      category,
      subCategory,
      excludeSlug,
      excludeProductId,
    ],
    queryFn: () =>
      getProductsApi({
        page,
        limit,
        type,
        category,
        subCategory,
        excludeSlug,
        excludeProductId,
      }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useFilteredProducts = ({
  page = 1,
  limit = 12,
  category,
  subCategory,
  brand,
  minPrice,
  maxPrice,
  rating,
  color,
  size,
  sort,
  excludeSlug,
  excludeProductId,
}: ProductFilters = {}) => {
  return useQuery({
    queryKey: [
      "filtered-products",
      page,
      limit,
      category,
      subCategory,
      brand,
      minPrice,
      maxPrice,
      rating,
      color,
      size,
      sort,
      excludeSlug,
      excludeProductId,
    ],
    queryFn: () =>
      getFilteredProductsApi({
        page,
        limit,
        category,
        subCategory,
        brand,
        minPrice,
        maxPrice,
        rating,
        color,
        size,
        sort,
        excludeSlug,
        excludeProductId,
      }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useSearchProducts = ({
  q = "",
  page = 1,
  limit = 12,
  category,
  sort,
}: SearchProductsParams = {}) => {
  return useQuery({
    queryKey: ["search-products", q, page, limit, category, sort],
    queryFn: () =>
      searchProductsApi({
        q,
        page,
        limit,
        category,
        sort,
      }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useEventProducts = ({
  page = 1,
  limit = 12,
  category,
  subCategory,
  status = "all",
}: EventProductsParams = {}) => {
  return useQuery({
    queryKey: ["event-products", page, limit, category, subCategory, status],
    queryFn: () =>
      getEventProductsApi({
        page,
        limit,
        category,
        subCategory,
        status,
      }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useTopShops = ({
  limit = 10,
  category,
}: TopShopsParams = {}) => {
  return useQuery({
    queryKey: ["top-shops", limit, category],
    queryFn: () =>
      getTopShopsApi({
        limit,
        category,
      }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
