import axiosInstance from "@/libs/axios";
import {
  CreateReviewPayload,
  MyReviewsResponse,
  ProductReviewsResponse,
  ReviewEligibilityResponse,
  ReviewMutationResponse,
  ReviewRequestResponse,
  ReviewSummaryResponse,
  ShopReviewsResponse,
  SubmitReviewRequestPayload,
  UpdateReviewPayload,
} from "@/types/review";

const getApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return apiUrl;
};

const getProductApiBaseUrl = () => `${getApiUrl()}/product/api`;

export const getProductReviewSummaryApi = async (
  productId: string,
): Promise<ReviewSummaryResponse> => {
  const response = await fetch(
    `${getProductApiBaseUrl()}/products/${encodeURIComponent(
      productId,
    )}/review-summary`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch review summary");
  }

  return response.json();
};

export const getProductReviewsApi = async (
  productId: string,
  { page = 1, limit = 5 }: { page?: number; limit?: number } = {},
): Promise<ProductReviewsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(
    `${getProductApiBaseUrl()}/products/${encodeURIComponent(
      productId,
    )}/reviews?${query.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch product reviews");
  }

  return response.json();
};

export const getShopReviewSummaryApi = async (
  shopId: string,
): Promise<ReviewSummaryResponse> => {
  const response = await fetch(
    `${getProductApiBaseUrl()}/shops/${encodeURIComponent(
      shopId,
    )}/review-summary`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch shop review summary");
  }

  return response.json();
};

export const getShopReviewsApi = async (
  shopId: string,
  { page = 1, limit = 5 }: { page?: number; limit?: number } = {},
): Promise<ShopReviewsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(
    `${getProductApiBaseUrl()}/shops/${encodeURIComponent(
      shopId,
    )}/reviews?${query.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch shop reviews");
  }

  return response.json();
};

export const getReviewEligibilityApi = async (
  productId: string,
): Promise<ReviewEligibilityResponse> => {
  const res = await axiosInstance.get<ReviewEligibilityResponse>(
    `${getProductApiBaseUrl()}/reviews/eligibility`,
    {
      params: { productId },
    },
  );

  return res.data;
};

export const getMyReviewsApi = async ({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<MyReviewsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await axiosInstance.get<MyReviewsResponse>(
    `${getProductApiBaseUrl()}/my-reviews?${query.toString()}`,
  );

  return res.data;
};

export const getReviewRequestApi = async (
  code: string,
): Promise<ReviewRequestResponse> => {
  const res = await axiosInstance.get<ReviewRequestResponse>(
    `${getProductApiBaseUrl()}/reviews/requests/${encodeURIComponent(code)}`,
  );

  return res.data;
};

export const submitReviewRequestApi = async ({
  code,
  payload,
}: {
  code: string;
  payload: SubmitReviewRequestPayload;
}): Promise<ReviewMutationResponse> => {
  const res = await axiosInstance.post<ReviewMutationResponse>(
    `${getProductApiBaseUrl()}/reviews/requests/${encodeURIComponent(
      code,
    )}/submit`,
    payload,
  );

  return res.data;
};

export const createReviewApi = async (
  payload: CreateReviewPayload,
): Promise<ReviewMutationResponse> => {
  const res = await axiosInstance.post<ReviewMutationResponse>(
    `${getProductApiBaseUrl()}/reviews`,
    payload,
  );

  return res.data;
};

export const updateReviewApi = async ({
  reviewId,
  payload,
}: {
  reviewId: string;
  payload: UpdateReviewPayload;
}): Promise<ReviewMutationResponse> => {
  const res = await axiosInstance.patch<ReviewMutationResponse>(
    `${getProductApiBaseUrl()}/reviews/${encodeURIComponent(reviewId)}`,
    payload,
  );

  return res.data;
};

export const deleteReviewApi = async (
  reviewId: string,
): Promise<ReviewMutationResponse> => {
  const res = await axiosInstance.delete<ReviewMutationResponse>(
    `${getProductApiBaseUrl()}/reviews/${encodeURIComponent(reviewId)}`,
  );

  return res.data;
};
