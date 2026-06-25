"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Edit3,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { ProductRatingStars } from "@/components/products/product-rating-stars";
import {
  useDeleteMyReview,
  useMyReviews,
  useUpdateMyReview,
} from "@/hooks/useReviews";
import type { ProductReview, UpdateReviewPayload } from "@/types/review";
import { getProductThumbnail } from "@/utils/image-assets";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

interface ReviewFormState {
  rating: number;
  title: string;
  comment: string;
}

const getInitialFormState = (review?: ProductReview): ReviewFormState => ({
  rating: review?.rating || 0,
  title: review?.title || "",
  comment: review?.comment || "",
});

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

const getProductImage = (review: ProductReview) =>
  review.product ? getProductThumbnail(review.product) || PRODUCT_PLACEHOLDER_IMAGE : PRODUCT_PLACEHOLDER_IMAGE;

const getProductTitle = (review: ProductReview) =>
  review.product?.title?.trim() || "Reviewed product";

const getProductHref = (review: ProductReview) =>
  review.product?.slug ? `/product/${review.product.slug}` : undefined;

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as any)?.response?.data?.message ||
  (error as Error)?.message ||
  fallback;

const validateReviewForm = ({ rating, title, comment }: ReviewFormState) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Choose a rating from 1 to 5 stars.";
  }

  if (title.trim().length > 120) {
    return "Review title cannot be longer than 120 characters.";
  }

  if (comment.trim().length > 2000) {
    return "Review comment cannot be longer than 2000 characters.";
  }

  return "";
};

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup">
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const isSelected = rating <= value;

        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="rounded-full p-1 text-amber-400 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
            aria-checked={value === rating}
            role="radio"
          >
            <Star
              className={`h-6 w-6 ${
                isSelected ? "fill-amber-400" : "text-stone-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewEditForm({
  state,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  state: ReviewFormState;
  isSaving: boolean;
  onChange: (nextState: ReviewFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const formError = validateReviewForm(state);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4"
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-gray-800">Rating *</p>
          <RatingInput
            value={state.rating}
            onChange={(rating) => onChange({ ...state, rating })}
          />
        </div>

        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-800">
            Title
          </span>
          <input
            value={state.title}
            onChange={(event) =>
              onChange({ ...state, title: event.target.value })
            }
            maxLength={120}
            placeholder="Sum up your experience"
            className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <span className="mt-1 block text-xs text-gray-500">
            {state.title.trim().length}/120
          </span>
        </label>

        <label>
          <span className="mb-1 block text-sm font-semibold text-gray-800">
            Comment
          </span>
          <textarea
            value={state.comment}
            onChange={(event) =>
              onChange({ ...state, comment: event.target.value })
            }
            maxLength={2000}
            rows={4}
            placeholder="Update your review"
            className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <span className="mt-1 block text-xs text-gray-500">
            {state.comment.trim().length}/2000
          </span>
        </label>

        {formError ? (
          <p className="text-sm font-semibold text-red-600">{formError}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || Boolean(formError)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save review
          </button>
        </div>
      </div>
    </form>
  );
}

function ReviewCard({
  review,
  isEditing,
  editState,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onSaveEdit,
  onAskDelete,
}: {
  review: ProductReview;
  isEditing: boolean;
  editState: ReviewFormState;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (nextState: ReviewFormState) => void;
  onSaveEdit: () => void;
  onAskDelete: () => void;
}) {
  const productHref = getProductHref(review);
  const productTitle = getProductTitle(review);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
          <img
            src={getProductImage(review)}
            alt={productTitle}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              {productHref ? (
                <Link
                  href={productHref}
                  className="line-clamp-2 text-base font-bold text-gray-900 transition hover:text-amber-700"
                >
                  {productTitle}
                </Link>
              ) : (
                <h3 className="line-clamp-2 text-base font-bold text-gray-900">
                  {productTitle}
                </h3>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ProductRatingStars rating={review.rating} />
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                  {review.status || "Published"}
                </span>
              </div>
            </div>

            {!isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onAskDelete}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
            <span>Created {formatDate(review.createdAt)}</span>
            {review.updatedAt && review.updatedAt !== review.createdAt ? (
              <span>Updated {formatDate(review.updatedAt)}</span>
            ) : null}
          </div>

          {isEditing ? (
            <ReviewEditForm
              state={editState}
              isSaving={isSaving}
              onChange={onEditChange}
              onCancel={onCancelEdit}
              onSubmit={onSaveEdit}
            />
          ) : (
            <div className="mt-4">
              {review.title ? (
                <p className="font-semibold text-gray-900">{review.title}</p>
              ) : null}
              {review.comment ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                  {review.comment}
                </p>
              ) : (
                <p className="text-sm text-gray-500">No written comment.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function MyReviewsSection() {
  const [page, setPage] = useState(1);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editState, setEditState] = useState<ReviewFormState>(
    getInitialFormState(),
  );
  const [reviewPendingDelete, setReviewPendingDelete] =
    useState<ProductReview | null>(null);
  const limit = 10;
  const reviewsQuery = useMyReviews({ page, limit });
  const updateReview = useUpdateMyReview();
  const deleteReview = useDeleteMyReview();
  const reviews = reviewsQuery.data?.reviews || [];
  const pagination = reviewsQuery.data?.pagination;

  const startEdit = (review: ProductReview) => {
    setEditingReviewId(review.id);
    setEditState(getInitialFormState(review));
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditState(getInitialFormState());
  };

  const saveEdit = async (review: ProductReview) => {
    const validationError = validateReviewForm(editState);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: UpdateReviewPayload = {
      rating: editState.rating,
      title: editState.title.trim() || undefined,
      comment: editState.comment.trim() || undefined,
    };

    try {
      await updateReview.mutateAsync({
        reviewId: review.id,
        payload,
      });
      cancelEdit();
      toast.success("Review updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update review"));
    }
  };

  const confirmDeleteReview = async () => {
    if (!reviewPendingDelete) return;

    try {
      await deleteReview.mutateAsync({
        reviewId: reviewPendingDelete.id,
        productId: reviewPendingDelete.productId,
      });
      setReviewPendingDelete(null);
      toast.success("Review deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete review"));
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Reviews</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage reviews you submitted for delivered purchases.
          </p>
        </div>
      </div>

      {reviewsQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl bg-stone-100"
            />
          ))}
        </div>
      ) : null}

      {reviewsQuery.isError ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Unable to load reviews
          </h3>
          <p className="mt-2 text-sm text-gray-600">Please try again.</p>
          <button
            type="button"
            onClick={() => reviewsQuery.refetch()}
            disabled={reviewsQuery.isFetching}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {reviewsQuery.isFetching ? "Trying again..." : "Retry"}
          </button>
        </div>
      ) : null}

      {!reviewsQuery.isLoading &&
      !reviewsQuery.isError &&
      reviews.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-gray-900">
            No reviews yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Review links appear after delivered orders. Submitted reviews will
            show here.
          </p>
          <Link
            href="/profile?tab=orders"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            View orders
          </Link>
        </div>
      ) : null}

      {!reviewsQuery.isLoading &&
      !reviewsQuery.isError &&
      reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isEditing={editingReviewId === review.id}
              editState={editState}
              isSaving={updateReview.isPending}
              onStartEdit={() => startEdit(review)}
              onCancelEdit={cancelEdit}
              onEditChange={setEditState}
              onSaveEdit={() => saveEdit(review)}
              onAskDelete={() => setReviewPendingDelete(review)}
            />
          ))}

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!pagination.hasPreviousPage}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1),
                  )
                }
                disabled={!pagination.hasNextPage}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {reviewPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Delete review?
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  This removes your review from public product and shop review
                  sections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewPendingDelete(null)}
                className="rounded-full p-1 text-gray-500 transition hover:bg-stone-100"
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReviewPendingDelete(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteReview}
                disabled={deleteReview.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteReview.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Delete review
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
