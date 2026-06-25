"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCw,
  Star,
} from "lucide-react";
import { ProductRatingStars } from "@/components/products/product-rating-stars";
import { useProfile } from "@/hooks/useProfile";
import {
  useReviewRequest,
  useSubmitReviewRequest,
} from "@/hooks/useReviews";
import { ReviewMutationResponse } from "@/types/review";

interface ReviewSubmitViewProps {
  code: string;
}

interface ReviewFormState {
  rating: number;
  title: string;
  comment: string;
}

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

const getInitialFormState = (): ReviewFormState => ({
  rating: 0,
  title: "",
  comment: "",
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

const getErrorStatus = (error: unknown) =>
  (error as any)?.response?.status as number | undefined;

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as any)?.response?.data?.message ||
  (error as Error)?.message ||
  fallback;

const isAuthError = (error: unknown) => {
  const status = getErrorStatus(error);
  return status === 400 || status === 401;
};

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
              className={`h-7 w-7 ${
                isSelected ? "fill-amber-400" : "text-stone-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function StatePanel({
  icon,
  title,
  message,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-gray-700">
        {icon}
      </div>
      <h1 className="mt-5 text-xl font-extrabold text-gray-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600">
        {message}
      </p>
      {actions ? <div className="mt-6">{actions}</div> : null}
    </section>
  );
}

export function ReviewSubmitView({ code }: ReviewSubmitViewProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<ReviewFormState>(
    getInitialFormState(),
  );
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState<ReviewMutationResponse | null>(
    null,
  );
  const profileQuery = useProfile();
  const redirectPath = `/reviews/submit/${encodeURIComponent(code)}`;
  const shouldRedirectToLogin =
    profileQuery.isError && isAuthError(profileQuery.error);
  const requestQuery = useReviewRequest(code, Boolean(profileQuery.data));
  const submitReview = useSubmitReviewRequest(code);
  const request = requestQuery.data?.request;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [redirectPath, router, shouldRedirectToLogin]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateReviewForm(formState);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");

    try {
      const result = await submitReview.mutateAsync({
        rating: formState.rating,
        title: formState.title.trim() || undefined,
        comment: formState.comment.trim() || undefined,
      });

      setSubmitted(result);
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to submit your review."));
    }
  };

  if (
    profileQuery.isLoading ||
    shouldRedirectToLogin ||
    requestQuery.isLoading
  ) {
    return (
      <StatePanel
        icon={<Loader2 className="h-7 w-7 animate-spin text-amber-700" />}
        title="Loading review request"
        message="We are checking your review link and purchase details."
      />
    );
  }

  if (profileQuery.isError) {
    return (
      <StatePanel
        icon={<AlertCircle className="h-7 w-7 text-red-600" />}
        title="Unable to verify your account"
        message="Please sign in again to continue."
        actions={
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (requestQuery.isError || !request) {
    const status = getErrorStatus(requestQuery.error);
    const isForbidden = status === 403;

    return (
      <StatePanel
        icon={<AlertCircle className="h-7 w-7 text-red-600" />}
        title={
          isForbidden
            ? "You are not allowed to use this review link."
            : "This review link is invalid or no longer available."
        }
        message={
          isForbidden
            ? "This link belongs to another account."
            : "Please check the notification link or return to your orders."
        }
        actions={
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => requestQuery.refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <Link
              href="/profile?tab=orders"
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Back to orders
            </Link>
          </div>
        }
      />
    );
  }

  if (submitted) {
    return (
      <StatePanel
        icon={<CheckCircle2 className="h-7 w-7 text-emerald-600" />}
        title="Thank you for your review."
        message="Your feedback helps other shoppers make confident choices."
        actions={
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {request.product?.slug ? (
              <Link
                href={`/product/${request.product.slug}`}
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                View product
              </Link>
            ) : null}
            <Link
              href="/profile?tab=orders"
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
            >
              Back to orders
            </Link>
          </div>
        }
      />
    );
  }

  const existingReview = request.existingReview;
  const productTitle =
    request.product?.title || request.orderItem?.title || "Reviewed product";
  const stateMessage =
    request.status === "Expired"
      ? "This review link has expired."
      : request.status === "Used" || existingReview
        ? "This product has already been reviewed."
        : request.status === "Revoked"
          ? "This review link is no longer available."
          : request.reason || "";

  if (!request.canSubmit) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
            <img
              src={request.product?.image || request.orderItem?.imageUrl || PRODUCT_PLACEHOLDER_IMAGE}
              alt={productTitle}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Review request
            </p>
            <h1 className="mt-2 break-words text-2xl font-extrabold text-gray-900">
              {stateMessage || "This review request is not available."}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {productTitle}
            </p>

            {existingReview ? (
              <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <ProductRatingStars rating={existingReview.rating} />
                  <span className="text-sm text-gray-500">
                    Reviewed {formatDate(existingReview.createdAt)}
                  </span>
                </div>
                {existingReview.title ? (
                  <p className="mt-3 font-semibold text-gray-900">
                    {existingReview.title}
                  </p>
                ) : null}
                {existingReview.comment ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                    {existingReview.comment}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {request.product?.slug ? (
                <Link
                  href={`/product/${request.product.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  View product
                </Link>
              ) : null}
              <Link
                href="/profile?tab=orders"
                className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
              >
                Back to orders
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          Delivered purchase
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
          Submit your review
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Share your experience with this delivered item. Your review will be
          linked to this verified purchase.
        </p>

        <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <img
              src={request.product?.image || request.orderItem?.imageUrl || PRODUCT_PLACEHOLDER_IMAGE}
              alt={productTitle}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold text-gray-900">
              {productTitle}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
              {request.order?.orderNumber ? (
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                  Order {request.order.orderNumber}
                </span>
              ) : null}
              {request.orderItem?.quantity ? (
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                  Qty {request.orderItem.quantity}
                </span>
              ) : null}
              {request.order?.deliveredAt ? (
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                  Delivered {formatDate(request.order.deliveredAt)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">Your review</h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-800">
              Rating *
            </p>
            <RatingInput
              value={formState.rating}
              onChange={(rating) => {
                setFormState((current) => ({ ...current, rating }));
                setFormError("");
              }}
            />
          </div>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-800">
              Title
            </span>
            <input
              value={formState.title}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              maxLength={120}
              placeholder="Sum up your experience"
              className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <span className="mt-1 block text-xs text-gray-500">
              {formState.title.trim().length}/120
            </span>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold text-gray-800">
              Comment
            </span>
            <textarea
              value={formState.comment}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
              maxLength={2000}
              rows={5}
              placeholder="Tell other shoppers what stood out."
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <span className="mt-1 block text-xs text-gray-500">
              {formState.comment.trim().length}/2000
            </span>
          </label>

          {formError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitReview.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitReview.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Submit review
          </button>
        </form>
      </section>
    </div>
  );
}
