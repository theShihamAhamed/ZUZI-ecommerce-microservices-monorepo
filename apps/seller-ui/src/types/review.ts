export type SellerReviewStatus = "Published" | "Hidden" | "Reported" | "Deleted";

export interface SellerReviewsQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  rating?: string;
  status?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

export interface SellerReviewUser {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

export interface SellerReviewProduct {
  id: string;
  title?: string | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

export interface SellerReview {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status: SellerReviewStatus;
  sellerReply?: string | null;
  repliedAt?: string | null;
  reportedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: SellerReviewUser | null;
  product?: SellerReviewProduct | null;
}

export interface SellerReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  unrepliedCount: number;
  reportedCount: number;
}

export interface SellerReviewsPagination {
  total: number;
  totalItems?: number;
  page: number;
  currentPage?: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SellerReviewsResponse {
  success: boolean;
  reviews: SellerReview[];
  pagination?: SellerReviewsPagination;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: SellerReviewSummary;
}

export interface SellerReviewMutationResponse {
  success: boolean;
  review?: {
    id: string;
    sellerReply?: string | null;
    repliedAt?: string | null;
    reportedAt?: string | null;
  };
  message?: string;
}
