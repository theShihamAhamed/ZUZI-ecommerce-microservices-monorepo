import { ImageAsset, ProductImage } from "@/types/product";

export interface ReviewDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
  distribution: ReviewDistribution;
}

export interface ReviewSummaryResponse extends ReviewSummary {
  success: boolean;
}

export interface ReviewUser {
  id: string;
  name?: string | null;
  avatar?: ImageAsset | string | null;
}

export interface ProductReview {
  id: string;
  productId: string;
  orderItemId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status?: string;
  sellerReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedPurchase?: boolean;
  user?: ReviewUser | null;
  product?: {
    id: string;
    title?: string | null;
    slug?: string | null;
    thumbnail?: string | null;
    images?: ProductImage[];
  } | null;
}

export interface ReviewsPagination {
  total: number;
  totalCount?: number;
  totalItems?: number;
  page: number;
  currentPage?: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductReviewsResponse {
  success: boolean;
  reviews: ProductReview[];
  pagination: ReviewsPagination;
}

export type ShopReviewsResponse = ProductReviewsResponse;
export type MyReviewsResponse = ProductReviewsResponse;

export interface EligibleOrderItem {
  orderId: string;
  orderItemId: string;
  productId: string;
  purchasedAt?: string;
  deliveredAt?: string;
}

export interface ExistingReview {
  id: string;
  orderItemId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEligibilityResponse {
  success: boolean;
  eligible: boolean;
  reason?: string;
  eligibleOrderItems: EligibleOrderItem[];
  existingReviews: ExistingReview[];
}

export interface CreateReviewPayload {
  productId: string;
  orderItemId: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewPayload {
  rating: number;
  title?: string;
  comment?: string;
}

export interface ReviewRequestContext {
  publicId: string;
  status: "Pending" | "Used" | "Expired" | "Revoked";
  expiresAt: string;
  usedAt?: string | null;
  canSubmit: boolean;
  reason?: string;
  product: {
    id: string;
    title: string;
    slug?: string | null;
    image?: string | null;
  } | null;
  order: {
    id: string;
    orderNumber?: string | null;
    deliveredAt?: string | null;
  } | null;
  orderItem: {
    id: string;
    title: string;
    imageUrl?: string | null;
    quantity: number;
  } | null;
  existingReview?: {
    id: string;
    rating: number;
    title?: string | null;
    comment?: string | null;
    createdAt: string;
  } | null;
}

export interface ReviewRequestResponse {
  success: boolean;
  request: ReviewRequestContext;
}

export interface SubmitReviewRequestPayload {
  rating: number;
  title?: string;
  comment?: string;
}

export interface ReviewMutationResponse {
  success: boolean;
  review?: ProductReview;
  summary?: ReviewSummary;
  productSummary?: ReviewSummary;
  shopSummary?: ReviewSummary;
  message?: string;
}
