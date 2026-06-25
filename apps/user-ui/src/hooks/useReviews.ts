"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReviewApi,
  deleteReviewApi,
  getMyReviewsApi,
  getProductReviewsApi,
  getProductReviewSummaryApi,
  getReviewEligibilityApi,
  getReviewRequestApi,
  getShopReviewsApi,
  getShopReviewSummaryApi,
  submitReviewRequestApi,
  updateReviewApi,
} from "@/services/review.api";
import {
  CreateReviewPayload,
  SubmitReviewRequestPayload,
  UpdateReviewPayload,
} from "@/types/review";

export const reviewQueryKeys = {
  summary: (productId: string) => ["product-review-summary", productId] as const,
  reviewsRoot: (productId: string) => ["product-reviews", productId] as const,
  reviews: (productId: string, page: number, limit: number) =>
    ["product-reviews", productId, page, limit] as const,
  shopSummary: (shopId: string) => ["shop-review-summary", shopId] as const,
  shopReviews: (shopId: string, page: number, limit: number) =>
    ["shop-reviews", shopId, page, limit] as const,
  myReviewsRoot: () => ["my-reviews"] as const,
  myReviews: (page: number, limit: number) =>
    ["my-reviews", page, limit] as const,
  eligibility: (productId: string) =>
    ["product-review-eligibility", productId] as const,
  request: (code: string) => ["review-request", code] as const,
};

const invalidateProductReviewQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) => {
  queryClient.invalidateQueries({
    queryKey: reviewQueryKeys.summary(productId),
  });
  queryClient.invalidateQueries({
    queryKey: reviewQueryKeys.reviewsRoot(productId),
  });
  queryClient.invalidateQueries({
    queryKey: reviewQueryKeys.eligibility(productId),
  });
};

export const useProductReviewSummary = (productId: string) =>
  useQuery({
    queryKey: reviewQueryKeys.summary(productId),
    queryFn: () => getProductReviewSummaryApi(productId),
    enabled: Boolean(productId),
    staleTime: 1000 * 60,
    retry: 1,
  });

export const useProductReviews = ({
  productId,
  page = 1,
  limit = 5,
}: {
  productId: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: reviewQueryKeys.reviews(productId, page, limit),
    queryFn: () => getProductReviewsApi(productId, { page, limit }),
    enabled: Boolean(productId),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
    retry: 1,
  });

export const useShopReviewSummary = (shopId: string) =>
  useQuery({
    queryKey: reviewQueryKeys.shopSummary(shopId),
    queryFn: () => getShopReviewSummaryApi(shopId),
    enabled: Boolean(shopId),
    staleTime: 1000 * 60,
    retry: 1,
  });

export const useShopReviews = ({
  shopId,
  page = 1,
  limit = 5,
}: {
  shopId: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: reviewQueryKeys.shopReviews(shopId, page, limit),
    queryFn: () => getShopReviewsApi(shopId, { page, limit }),
    enabled: Boolean(shopId),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
    retry: 1,
  });

export const useReviewEligibility = ({
  productId,
  enabled,
}: {
  productId: string;
  enabled: boolean;
}) =>
  useQuery({
    queryKey: reviewQueryKeys.eligibility(productId),
    queryFn: () => getReviewEligibilityApi(productId),
    enabled: Boolean(productId) && enabled,
    staleTime: 1000 * 30,
    retry: false,
  });

export const useMyReviews = ({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: reviewQueryKeys.myReviews(page, limit),
    queryFn: () => getMyReviewsApi({ page, limit }),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
    retry: 1,
  });

export const useReviewRequest = (code: string, enabled = true) =>
  useQuery({
    queryKey: reviewQueryKeys.request(code),
    queryFn: () => getReviewRequestApi(code),
    enabled: enabled && Boolean(code),
    retry: false,
  });

export const useSubmitReviewRequest = (code: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitReviewRequestPayload) =>
      submitReviewRequestApi({ code, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.request(code),
      });
    },
  });
};

export const useUpdateMyReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: UpdateReviewPayload;
    }) => updateReviewApi({ reviewId, payload }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.myReviewsRoot(),
      });

      if (result.review?.productId) {
        invalidateProductReviewQueries(queryClient, result.review.productId);
      }
    },
  });
};

export const useDeleteMyReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
    }: {
      reviewId: string;
      productId?: string | null;
    }) => deleteReviewApi(reviewId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.myReviewsRoot(),
      });

      if (variables.productId) {
        invalidateProductReviewQueries(queryClient, variables.productId);
      }
    },
  });
};

export const useCreateReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => createReviewApi(payload),
    onSuccess: () => invalidateProductReviewQueries(queryClient, productId),
  });
};

export const useUpdateReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: UpdateReviewPayload;
    }) => updateReviewApi({ reviewId, payload }),
    onSuccess: () => invalidateProductReviewQueries(queryClient, productId),
  });
};

export const useDeleteReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => deleteReviewApi(reviewId),
    onSuccess: () => invalidateProductReviewQueries(queryClient, productId),
  });
};
