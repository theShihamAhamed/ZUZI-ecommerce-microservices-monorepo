"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Flag,
  Loader2,
  MessageSquareReply,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProduct } from "@/hooks/useProduct";
import {
  useReplyToReview,
  useReportReview,
  useSellerReviews,
} from "@/hooks/useSellerReviews";
import { SellerReview } from "@/types/review";

const REVIEWS_LIMIT = 10;
const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

const ratingOptions = [
  { value: "all", label: "All ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "Published", label: "Published" },
  { value: "Hidden", label: "Hidden" },
  { value: "Reported", label: "Reported" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest-rating", label: "Highest rating" },
  { value: "lowest-rating", label: "Lowest rating" },
];

const datePresetOptions = [
  { value: "today", label: "Today" },
  { value: "last-7", label: "Last 7 days" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
];

const filterControlClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as any)?.response?.data?.message ||
  (error as Error)?.message ||
  fallback;

const formatDate = (date?: string | null) => {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDatePresetRange = (preset: string) => {
  const today = new Date();
  const start = new Date(today);

  switch (preset) {
    case "today":
      return {
        from: toDateInputValue(today),
        to: toDateInputValue(today),
      };
    case "last-7":
      start.setDate(today.getDate() - 6);
      return {
        from: toDateInputValue(start),
        to: toDateInputValue(today),
      };
    case "last-30":
      start.setDate(today.getDate() - 29);
      return {
        from: toDateInputValue(start),
        to: toDateInputValue(today),
      };
    case "this-month":
      start.setDate(1);
      return {
        from: toDateInputValue(start),
        to: toDateInputValue(today),
      };
    default:
      return { from: "", to: "" };
  }
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const isFilled = index + 1 <= rating;

        return (
          <Star
            key={index}
            className={`h-4 w-4 ${
              isFilled ? "fill-amber-400 text-amber-400" : "text-slate-300"
            }`}
          />
        );
      })}
    </div>
  );
}

function RatingDistribution({
  distribution,
  total,
}: {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
}) {
  const denominator = Math.max(total, 1);

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = distribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
        const width = `${Math.round((count / denominator) * 100)}%`;

        return (
          <div
            key={rating}
            className="grid grid-cols-[42px_1fr_28px] items-center gap-2 text-xs"
          >
            <span className="font-semibold text-slate-600">{rating} star</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width }}
              />
            </div>
            <span className="text-right text-slate-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function getStatusStyle(review: SellerReview) {
  if (review.reportedAt) return "bg-red-50 text-red-700";

  switch (review.status) {
    case "Published":
      return "bg-emerald-50 text-emerald-700";
    case "Hidden":
      return "bg-slate-100 text-slate-700";
    case "Reported":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function ReplyModal({
  review,
  reply,
  isSaving,
  onReplyChange,
  onClose,
  onSave,
}: {
  review: SellerReview;
  reply: string;
  isSaving: boolean;
  onReplyChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isTooLong = reply.trim().length > 1000;
  const isEmpty = reply.trim().length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {review.sellerReply ? "Edit reply" : "Reply to review"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your reply will be visible on public product and shop review
              sections.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close reply editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          maxLength={1000}
          rows={6}
          placeholder="Thank the customer or address the feedback professionally."
          className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <span
            className={isTooLong || isEmpty ? "text-red-600" : "text-slate-500"}
          >
            {isEmpty
              ? "Reply is required."
              : isTooLong
                ? "Reply cannot be longer than 1000 characters."
                : "Keep replies concise and helpful."}
          </span>
          <span className="font-semibold text-slate-500">
            {reply.trim().length}/1000
          </span>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isTooLong || isEmpty}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save reply
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  review,
  isReporting,
  onClose,
  onConfirm,
}: {
  review: SellerReview;
  isReporting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Report this review?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This will flag the review for admin moderation. It will not delete
              the review immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close report confirmation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          {review.title || review.comment || "Review without written comment."}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isReporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Report review
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  onReply,
  onReport,
}: {
  review: SellerReview;
  onReply: (review: SellerReview) => void;
  onReport: (review: SellerReview) => void;
}) {
  const productTitle =
    review.product?.title || review.product?.name || "Reviewed product";
  const productImage = review.product?.image || PRODUCT_PLACEHOLDER_IMAGE;
  const productHref = review.product?.slug
    ? `/dashboard/products/${review.product.id}/edit`
    : undefined;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img
              src={productImage}
              alt={productTitle}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            {productHref ? (
              <Link
                href={productHref}
                className="line-clamp-2 font-semibold text-slate-950 transition hover:text-emerald-700"
              >
                {productTitle}
              </Link>
            ) : (
              <h3 className="line-clamp-2 font-semibold text-slate-950">
                {productTitle}
              </h3>
            )}
            <p className="mt-1 text-sm text-slate-500">
              By {review.user?.name || "Customer"} on {formatDate(review.createdAt)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <RatingStars rating={review.rating} />
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                  review,
                )}`}
              >
                {review.reportedAt ? "Reported" : review.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onReply(review)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <MessageSquareReply className="h-4 w-4" />
            {review.sellerReply ? "Edit reply" : "Reply"}
          </button>
          <button
            type="button"
            onClick={() => onReport(review)}
            disabled={Boolean(review.reportedAt)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            {review.reportedAt ? "Reported" : "Report"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {review.title ? (
          <p className="font-semibold text-slate-950">{review.title}</p>
        ) : null}
        {review.comment ? (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
            {review.comment}
          </p>
        ) : (
          <p className="text-sm text-slate-500">No written comment.</p>
        )}
      </div>

      {review.sellerReply ? (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Your reply
            </p>
            {review.repliedAt ? (
              <span className="text-xs font-semibold text-emerald-700">
                {formatDate(review.repliedAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {review.sellerReply}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export default function SellerReviewsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [rating, setRating] = useState("all");
  const [status, setStatus] = useState("all");
  const [productId, setProductId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [sort, setSort] = useState("newest");
  const [replyReview, setReplyReview] = useState<SellerReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportReview, setReportReview] = useState<SellerReview | null>(null);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const { getShopProducts } = useProduct();
  const productsQuery = getShopProducts({ page: 1, limit: 100 });
  const queryParams = useMemo(
    () => ({
      page,
      limit: REVIEWS_LIMIT,
      q: debouncedSearchTerm,
      rating,
      status,
      productId,
      dateFrom,
      dateTo,
      sort,
    }),
    [
      dateFrom,
      dateTo,
      debouncedSearchTerm,
      page,
      productId,
      rating,
      sort,
      status,
    ],
  );
  const reviewsQuery = useSellerReviews(queryParams);
  const replyMutation = useReplyToReview();
  const reportMutation = useReportReview();
  const reviews = reviewsQuery.data?.reviews || [];
  const pagination = reviewsQuery.data?.pagination;
  const summary = reviewsQuery.data?.summary;
  const totalReviews =
    pagination?.totalItems ?? pagination?.total ?? reviews.length;
  const totalPages = pagination?.totalPages || 1;
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    rating !== "all" ||
    status !== "all" ||
    productId !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sort !== "newest";

  const resetPageAndSet = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchTerm("");
    setRating("all");
    setStatus("all");
    setProductId("all");
    setDateFrom("");
    setDateTo("");
    setDatePreset("");
    setSort("newest");
  };

  const applyDatePreset = (preset: string) => {
    const range = getDatePresetRange(preset);

    setPage(1);
    setDatePreset(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const clearDateRange = () => {
    setPage(1);
    setDatePreset("");
    setDateFrom("");
    setDateTo("");
  };

  const openReplyModal = (review: SellerReview) => {
    setReplyReview(review);
    setReplyText(review.sellerReply || "");
  };

  const saveReply = async () => {
    if (!replyReview) return;

    try {
      await replyMutation.mutateAsync({
        reviewId: replyReview.id,
        reply: replyText,
      });
      setReplyReview(null);
      setReplyText("");
      toast.success("Reply saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save reply"));
    }
  };

  const confirmReport = async () => {
    if (!reportReview) return;

    try {
      await reportMutation.mutateAsync(reportReview.id);
      setReportReview(null);
      toast.success("Review reported for admin moderation");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to report review"));
    }
  };

  const activeDateRangeText =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
      : dateFrom
        ? `From ${formatDate(dateFrom)}`
        : dateTo
          ? `Until ${formatDate(dateTo)}`
          : "No date range selected";

  const summaryCards = [
    {
      label: "Average Rating",
      value: summary ? summary.averageRating.toFixed(1) : "...",
      detail: `${summary?.totalReviews || 0} total reviews`,
      icon: Star,
    },
    {
      label: "Total Reviews",
      value: summary?.totalReviews ?? "...",
      detail: "Across your products",
      icon: CheckCircle2,
    },
    {
      label: "Unreplied",
      value: summary?.unrepliedCount ?? "...",
      detail: "Need seller response",
      icon: MessageSquareReply,
    },
    {
      label: "Reported",
      value: summary?.reportedCount ?? "...",
      detail: "Flagged for moderation",
      icon: Flag,
    },
  ];

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Dashboard / Reviews
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-slate-950">
            Reviews
          </h1>
          <p className="mt-1 max-w-3xl break-words text-sm text-slate-500">
            View customer product reviews, reply publicly, and flag reviews for
            later admin moderation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reviewsQuery.isFetching && !reviewsQuery.isLoading ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          ) : null}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <XCircle className="h-4 w-4" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">
                {card.label}
              </p>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-950">
              {reviewsQuery.isLoading ? "..." : card.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-950">
                Customer reviews
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {pagination
                  ? `${totalReviews} reviews found`
                  : "Loading review list"}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <SlidersHorizontal className="h-4 w-4" />
              Search and filters
            </div>
            <label className="relative mb-4 block min-w-0">
              <span className="sr-only">Search reviews</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setPage(1);
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search review, product, or customer..."
                className={`${filterControlClass} w-full pl-9`}
              />
            </label>

            <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                {datePresetOptions.map((option) => {
                  const isActive = datePreset === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => applyDatePreset(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={clearDateRange}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Clear dates
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Active range:{" "}
                <span className="font-semibold text-slate-700">
                  {activeDateRangeText}
                </span>
              </p>
            </div>

            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="min-w-0">
                <span className="sr-only">Rating</span>
                <select
                  value={rating}
                  onChange={(event) =>
                    resetPageAndSet(setRating, event.target.value)
                  }
                  className={`${filterControlClass} w-full`}
                >
                  {ratingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="sr-only">Review status</span>
                <select
                  value={status}
                  onChange={(event) =>
                    resetPageAndSet(setStatus, event.target.value)
                  }
                  className={`${filterControlClass} w-full`}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="sr-only">Product</span>
                <select
                  value={productId}
                  onChange={(event) =>
                    resetPageAndSet(setProductId, event.target.value)
                  }
                  className={`${filterControlClass} w-full`}
                >
                  <option value="all">All products</option>
                  {(productsQuery.data?.products || []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="sr-only">Date from</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDatePreset("custom");
                    resetPageAndSet(setDateFrom, event.target.value);
                  }}
                  className={`${filterControlClass} w-full`}
                />
              </label>

              <label className="min-w-0">
                <span className="sr-only">Date to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDatePreset("custom");
                    resetPageAndSet(setDateTo, event.target.value);
                  }}
                  className={`${filterControlClass} w-full`}
                />
              </label>

              <label className="min-w-0">
                <span className="sr-only">Sort reviews</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    resetPageAndSet(setSort, event.target.value)
                  }
                  className={`${filterControlClass} w-full`}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {reviewsQuery.isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : null}

          {reviewsQuery.isError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
              <h2 className="mt-3 font-semibold text-slate-950">
                Failed to load reviews
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                We could not fetch your product reviews. Please try again.
              </p>
              <button
                type="button"
                onClick={() => reviewsQuery.refetch()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : null}

          {!reviewsQuery.isLoading &&
          !reviewsQuery.isError &&
          reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Star className="mx-auto h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                {hasActiveFilters
                  ? "No reviews match your filters"
                  : "No reviews yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {hasActiveFilters
                  ? "Try a different rating, product, date range, or search."
                  : "Customer reviews will appear here after delivered orders are reviewed."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <XCircle className="h-4 w-4" />
                  Clear filters
                </button>
              ) : null}
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
                  onReply={openReplyModal}
                  onReport={setReportReview}
                />
              ))}
            </div>
          ) : null}

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!hasPreviousPage || reviewsQuery.isFetching}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-center text-sm text-slate-500">
                Page {pagination.currentPage ?? pagination.page} of{" "}
                {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.totalPages, current + 1),
                  )
                }
                disabled={!hasNextPage || reviewsQuery.isFetching}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Rating distribution
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Based on visible reviews for your shop.
          </p>
          <div className="mt-5">
            <RatingDistribution
              distribution={
                summary?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
              }
              total={summary?.totalReviews || 0}
            />
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              Reporting does not hide reviews.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Reported reviews stay public until a future admin moderation flow
              reviews them.
            </p>
          </div>
        </aside>
      </section>

      {replyReview ? (
        <ReplyModal
          review={replyReview}
          reply={replyText}
          isSaving={replyMutation.isPending}
          onReplyChange={setReplyText}
          onClose={() => {
            setReplyReview(null);
            setReplyText("");
          }}
          onSave={saveReply}
        />
      ) : null}

      {reportReview ? (
        <ReportModal
          review={reportReview}
          isReporting={reportMutation.isPending}
          onClose={() => setReportReview(null)}
          onConfirm={confirmReport}
        />
      ) : null}
    </div>
  );
}
