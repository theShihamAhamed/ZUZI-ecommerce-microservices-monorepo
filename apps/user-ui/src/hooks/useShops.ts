"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getShopEventsApi,
  getShopProductsApi,
  getShopsApi,
} from "@/services/product.api";
import {
  ShopEventsParams,
  ShopFilters,
  ShopProductsParams,
} from "@/types/shop";

export const useShops = ({
  page = 1,
  limit = 24,
  category,
  q,
}: ShopFilters = {}) => {
  return useQuery({
    queryKey: ["shops", page, limit, category, q],
    queryFn: () =>
      getShopsApi({
        page,
        limit,
        category,
        q,
      }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useShopProducts = (
  shopId: string,
  { page = 1, limit = 12, sort = "popular" }: ShopProductsParams = {},
  enabled = true,
) => {
  return useQuery({
    queryKey: ["shop-products", shopId, page, limit, sort],
    queryFn: () =>
      getShopProductsApi(shopId, {
        page,
        limit,
        sort,
      }),
    enabled: Boolean(shopId) && enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useShopEvents = (
  shopId: string,
  { page = 1, limit = 12, status = "all" }: ShopEventsParams = {},
  enabled = true,
) => {
  return useQuery({
    queryKey: ["shop-events", shopId, page, limit, status],
    queryFn: () =>
      getShopEventsApi(shopId, {
        page,
        limit,
        status,
      }),
    enabled: Boolean(shopId) && enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
