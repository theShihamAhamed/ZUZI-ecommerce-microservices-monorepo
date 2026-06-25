"use client";

import { useQuery } from "@tanstack/react-query";
import { getSellerShopAnalyticsApi } from "@/services/shop-analytics.api";

export const sellerShopAnalyticsQueryKey = ["seller-shop-analytics"] as const;

export const useSellerShopAnalytics = () => {
  return useQuery({
    queryKey: sellerShopAnalyticsQueryKey,
    queryFn: getSellerShopAnalyticsApi,
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });
};
