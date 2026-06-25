"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Package,
  RefreshCw,
} from "lucide-react";
import { ProductRatingStars } from "@/components/products/product-rating-stars";
import { useShopReviews, useShopReviewSummary } from "@/hooks/useReviews";
import {
  ProductReview,
  ReviewSummary,
} from "@/types/review";
import { getProductThumbnail } from "@/utils/image-assets";

interface ShopReviewsSectionProps {
  shopId: string;
}

const REVIEWS_LIMIT = 5;
const emptySummary: ReviewSummary = {
  averageRating: 0,
  reviewCount: 0,
  distribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getReviewUserName = (review: ProductReview) =>
  review.user?.name?.trim() || "Verified buyer";

const getProductImageUrl = (review: ProductReview) =>
  review.product
    ? getProductThumbnail(review.product) || "/images/product-placeholder.png"
    : "/images/product-placeholder.png";

function ReviewDistributionBars({ summary }: { summary: ReviewSummary }) {
  const maxCount = Math.max(1, summary.reviewCount);

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = summary.distribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
        const width = `${Math.round((count / maxCount) * 100)}%`;

        return (
          <div
            key={rating}
            className="grid grid-cols-[44px_1fr_32px] items-center gap-2 text-sm"
          >
            <span className="font-semibold text-gray-700">{rating} star</span>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width }}
              />
            </div>
            <span className="text-right text-gray-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ShopReviewCard({ review }: { review: ProductReview }) {
  const productTitle = review.product?.title?.trim() || "Reviewed product";
  const productHref = review.product?.slug
    ? `/product/${review.product.slug}`
    : undefined;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-stone-50">
          <img
            src={getProductImageUrl(review)}
            alt={productTitle}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {getReviewUserName(review)}
                </h3>
                {review.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified purchase
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ProductRatingStars rating={review.rating} />
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>
            </div>

            <div className="min-w-0 rounded-xl bg-stone-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
                <Package className="h-3.5 w-3.5 text-amber-600" />
                Product
              </div>
              {productHref ? (
                <Link
                  href={productHref}
                  className="mt-1 block truncate font-semibold text-gray-900 transition hover:text-amber-700"
                >
                  {productTitle}
                </Link>
              ) : (
                <p className="mt-1 truncate font-semibold text-gray-900">
                  {productTitle}
                </p>
              )}
            </div>
          </div>

          {review.title ? (
            <p className="mt-4 font-semibold text-gray-900">{review.title}</p>
          ) : null}
          {review.comment ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
              {review.comment}
            </p>
          ) : null}
          {review.sellerReply ? (
            <div className="mt-4 rounded-xl bg-stone-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Seller reply
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {review.sellerReply}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ShopReviewsSection({ shopId }: ShopReviewsSectionProps) {
  const [page, setPage] = useState(1);
  const summaryQuery = useShopReviewSummary(shopId);
  const reviewsQuery = useShopReviews({
    shopId,
    page,
    limit: REVIEWS_LIMIT,
  });
  const summary = summaryQuery.data || emptySummary;
  const reviews = reviewsQuery.data?.reviews || [];
  const pagination = reviewsQuery.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-gray-900">
            Shop reviews
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            Shop reviews come from verified product purchases from this shop.
          </p>

          {summaryQuery.isLoading ? (
            <div className="mt-4 h-7 w-48 animate-pulse rounded bg-stone-100" />
          ) : summary.reviewCount > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ProductRatingStars rating={summary.averageRating} />
              <span className="text-sm font-semibold text-gray-700">
                {summary.reviewCount}{" "}
                {summary.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-gray-700">
              <MessageSquare className="h-4 w-4 text-amber-600" />
              No reviews yet
            </p>
          )}
        </div>

        <div className="w-full rounded-2xl border border-stone-100 bg-stone-50 p-4 lg:max-w-sm">
          <ReviewDistributionBars summary={summary} />
        </div>
      </div>

      {summaryQuery.isError ? (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Unable to load shop review summary.
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {reviewsQuery.isLoading ? (
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl bg-stone-100"
            />
          ))
        ) : reviewsQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-7 w-7 text-red-600" />
            <p className="mt-3 text-sm font-semibold text-gray-900">
              Unable to load shop reviews
            </p>
            <button
              type="button"
              onClick={() => reviewsQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
            <h3 className="text-sm font-semibold text-gray-900">
              No reviews yet
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Verified product reviews for this shop will appear here.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <ShopReviewCard key={review.id} review={review} />
          ))
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasPreviousPage}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
