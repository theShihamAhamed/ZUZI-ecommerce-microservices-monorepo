import axiosInstance from "@/lib/axios";
import {
  SellerReviewMutationResponse,
  SellerReviewsQueryParams,
  SellerReviewsResponse,
} from "@/types/review";

export const getSellerReviewsApi = async ({
  page = 1,
  limit = 10,
  q,
  rating,
  status,
  productId,
  dateFrom,
  dateTo,
  sort,
}: SellerReviewsQueryParams = {}): Promise<SellerReviewsResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (q?.trim()) params.set("q", q.trim());
  if (rating && rating !== "all") params.set("rating", rating);
  if (status && status !== "all") params.set("status", status);
  if (productId && productId !== "all") params.set("productId", productId);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (sort && sort !== "newest") params.set("sort", sort);

  const res = await axiosInstance.get<SellerReviewsResponse>(
    `/product/api/seller/reviews?${params.toString()}`,
  );

  return res.data;
};

export const replyToReviewApi = async ({
  reviewId,
  reply,
}: {
  reviewId: string;
  reply: string;
}): Promise<SellerReviewMutationResponse> => {
  const res = await axiosInstance.patch<SellerReviewMutationResponse>(
    `/product/api/seller/reviews/${encodeURIComponent(reviewId)}/reply`,
    { reply },
  );

  return res.data;
};

export const reportReviewApi = async (
  reviewId: string,
): Promise<SellerReviewMutationResponse> => {
  const res = await axiosInstance.post<SellerReviewMutationResponse>(
    `/product/api/seller/reviews/${encodeURIComponent(reviewId)}/report`,
  );

  return res.data;
};
