import { Product } from "@/types/product";

export type RecommendationSource =
  | "personalized"
  | "cached"
  | "fallback"
  | "training_fallback";

export type RecommendationTrainingStatus =
  | "not_needed"
  | "queued"
  | "running"
  | "fresh"
  | "failed"
  | "stale"
  | "missing_cache";

export interface RecommendedProductsResponse {
  success: boolean;
  source: RecommendationSource;
  reason?: string;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  trainingStatus?: RecommendationTrainingStatus;
  recommendations: Product[];
}

interface GetRecommendedProductsParams {
  page?: number;
  limit?: number;
}

const getApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return apiUrl;
};

const normalizeProduct = (product: Product & { Shop?: Product["shop"] }) => {
  if (product.shop || !product.Shop) {
    return product;
  }

  const { Shop, ...rest } = product;
  return {
    ...rest,
    shop: Shop,
  } as Product;
};

export const getRecommendedProducts = async ({
  page = 1,
  limit = 12,
}: GetRecommendedProductsParams = {}): Promise<RecommendedProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`${apiUrl}/recommendation/api/products?${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch recommended products");
  }

  const data = (await response.json()) as RecommendedProductsResponse;

  return {
    ...data,
    recommendations: (data.recommendations || []).map(normalizeProduct),
  };
};
