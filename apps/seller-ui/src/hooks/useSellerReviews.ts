"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSellerReviewsApi,
  replyToReviewApi,
  reportReviewApi,
} from "@/services/review.api";
import { SellerReviewsQueryParams } from "@/types/review";

export const sellerReviewsQueryKeys = {
  root: ["seller-reviews"] as const,
  list: (params: SellerReviewsQueryParams) =>
    ["seller-reviews", params] as const,
};

export const useSellerReviews = (params: SellerReviewsQueryParams = {}) => {
  return useQuery({
    queryKey: sellerReviewsQueryKeys.list(params),
    queryFn: () => getSellerReviewsApi(params),
    placeholderData: (previousData) => previousData,
    retry: 1,
  });
};

export const useReplyToReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replyToReviewApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sellerReviewsQueryKeys.root,
      });
    },
  });
};

export const useReportReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportReviewApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sellerReviewsQueryKeys.root,
      });
    },
  });
};
