"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  getRecommendedProducts,
  RecommendedProductsResponse,
} from "@/services/recommendation.api";

const RECOMMENDATION_PAGE_SIZE = 12;

export const useRecommendedProducts = (limit = RECOMMENDATION_PAGE_SIZE) => {
  const query = useInfiniteQuery<RecommendedProductsResponse, Error>({
    queryKey: ["recommended-products", limit],
    queryFn: ({ pageParam }) =>
      getRecommendedProducts({
        page: Number(pageParam || 1),
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const products = useMemo(() => {
    const seen = new Set<string>();

    return (query.data?.pages || []).flatMap((page) =>
      page.recommendations.filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      }),
    );
  }, [query.data?.pages]);
  const firstPage = query.data?.pages[0];

  return {
    ...query,
    products,
    source: firstPage?.source,
    trainingStatus: firstPage?.trainingStatus,
    reason: firstPage?.reason,
  };
};
