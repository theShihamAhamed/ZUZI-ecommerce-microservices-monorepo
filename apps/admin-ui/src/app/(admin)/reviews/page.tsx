"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import type { Pagination } from "@/types/admin";

type ReviewStatus = "Published" | "Hidden" | "Reported" | "Deleted";

type AdminReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  sellerReply: string | null;
  repliedAt: string | null;
  reportedAt: string | null;
  hiddenAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  product: {
    id: string;
    title: string;
    slug: string;
    image: string | null;
  } | null;
  seller: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  shop: {
    id: string;
    name: string;
  } | null;
};

type ReviewSummary = {
  totalReviews: number;
  publishedCount: number;
  hiddenCount: number;
  reportedCount: number;
  deletedCount: number;
  averageRating: number;
};

type ReviewsResponse = {
  success: boolean;
  reviews: AdminReview[];
  data: AdminReview[];
  pagination: Pagination;
  summary: ReviewSummary;
};

type PendingAction =
  | { type: "hide"; review: AdminReview }
  | { type: "publish"; review: AdminReview }
  | { type: "delete"; review: AdminReview };

const statusOptions = ["all", "Published", "Hidden", "Reported", "Deleted"];
const ratingOptions = ["all", "5", "4", "3", "2", "1"];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest-rating", label: "Highest rating" },
  { value: "lowest-rating", label: "Lowest rating" },
];

const emptySummary: ReviewSummary = {
  totalReviews: 0,
  publishedCount: 0,
  hiddenCount: 0,
  reportedCount: 0,
  deletedCount: 0,
  averageRating: 0,
};

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getStatusBadgeClass = (status: ReviewStatus) => {
  switch (status) {
    case "Published":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "Hidden":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Reported":
      return "bg-red-50 text-red-700 ring-red-200";
    case "Deleted":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
};

const getActionCopy = (action: PendingAction) => {
  if (action.type === "hide") {
    return {
      title: "Hide review?",
      body: "This removes the review from public product and shop pages, then recalculates ratings.",
      button: "Hide review",
      buttonClass: "bg-amber-600 text-white hover:bg-amber-700",
    };
  }

  if (action.type === "publish") {
    return {
      title: "Publish review?",
      body: "This makes the review visible again and updates product and shop ratings.",
      button: "Publish review",
      buttonClass: "bg-emerald-600 text-white hover:bg-emerald-700",
    };
  }

  return {
    title: "Delete review?",
    body: "This soft-deletes the review from public pages. The record remains available for audit history.",
    button: "Delete review",
    buttonClass: "bg-red-600 text-white hover:bg-red-700",
  };
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rating ? "fill-current" : "text-stone-300"
          }`}
        />
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function ReviewsModerationPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<ReviewSummary>(emptySummary);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActing, setIsActing] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
      sort,
    });

    if (activeQuery) params.set("q", activeQuery);
    if (status !== "all") params.set("status", status);
    if (rating !== "all") params.set("rating", rating);
    if (reportedOnly) params.set("reportedOnly", "true");
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    return `/reviews?${params.toString()}`;
  }, [activeQuery, dateFrom, dateTo, page, rating, reportedOnly, sort, status]);

  const loadReviews = () => {
    setIsLoading(true);
    setError("");

    adminFetch<ReviewsResponse>(url)
      .then((response) => {
        setReviews(response.reviews || response.data || []);
        setPagination(response.pagination);
        setSummary(response.summary || emptySummary);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Reviews failed to load",
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadReviews();
  }, [url]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setActiveQuery(query.trim());
  };

  const resetFilters = () => {
    setQuery("");
    setActiveQuery("");
    setStatus("all");
    setRating("all");
    setReportedOnly(false);
    setSort("newest");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const runAction = async () => {
    if (!pendingAction) return;

    setIsActing(true);
    setError("");
    setNotice("");

    try {
      if (pendingAction.type === "delete") {
        await adminFetch<{ success: boolean; message?: string }>(
          `/reviews/${pendingAction.review.id}`,
          {
            method: "DELETE",
          },
        );
      } else {
        await adminFetch<{ success: boolean; message?: string }>(
          `/reviews/${pendingAction.review.id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status:
                pendingAction.type === "hide" ? "Hidden" : "Published",
            }),
          },
        );
      }

      setNotice("Review moderation action completed.");
      setPendingAction(null);
      loadReviews();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Review moderation action failed",
      );
    } finally {
      setIsActing(false);
    }
  };

  const actionCopy = pendingAction ? getActionCopy(pendingAction) : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-700">Moderation</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Reviews Moderation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review published, reported, hidden, and deleted customer product
              reviews. Hiding or publishing recalculates product and shop
              ratings.
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full lg:max-w-md">
            <label className="sr-only" htmlFor="review-search">
              Search reviews
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-300/25">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                id="review-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search review, product, customer, seller..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total reviews"
          value={summary.totalReviews}
          hint="All review records"
        />
        <SummaryCard
          label="Published"
          value={summary.publishedCount}
          hint={`Avg ${summary.averageRating || 0}/5`}
        />
        <SummaryCard
          label="Reported"
          value={summary.reportedCount}
          hint="Needs admin attention"
        />
        <SummaryCard
          label="Hidden"
          value={summary.hiddenCount}
          hint="Removed from public pages"
        />
        <SummaryCard
          label="Deleted"
          value={summary.deletedCount}
          hint="Soft-deleted records"
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/25"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All statuses" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Rating</span>
            <select
              value={rating}
              onChange={(event) => {
                setPage(1);
                setRating(event.target.value);
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/25"
            >
              {ratingOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All ratings" : `${option} stars`}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value);
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/25"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setPage(1);
                setDateFrom(event.target.value);
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/25"
            />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            <span>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setPage(1);
                setDateTo(event.target.value);
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/25"
            />
          </label>

          <div className="flex items-end gap-2">
            <label className="flex min-h-[42px] flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={reportedOnly}
                onChange={(event) => {
                  setPage(1);
                  setReportedOnly(event.target.checked);
                }}
                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Reported
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:text-slate-950"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product / shop</th>
                <th className="px-4 py-3">Seller reply</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-stone-100">
                      {Array.from({ length: 7 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-stone-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : reviews.map((review) => (
                    <tr
                      key={review.id}
                      className="border-b border-stone-100 align-top transition hover:bg-amber-50/40"
                    >
                      <td className="max-w-sm px-4 py-4">
                        <div className="flex items-center gap-2">
                          <RatingStars rating={review.rating} />
                          <span className="text-xs font-bold text-slate-500">
                            {review.rating}/5
                          </span>
                        </div>
                        <p className="mt-2 font-bold text-slate-950">
                          {review.title || "Untitled review"}
                        </p>
                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">
                          {review.comment || "No written comment."}
                        </p>
                        {review.reportedAt && (
                          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Reported {formatDate(review.reportedAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {review.user?.name || "Customer"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {review.user?.email || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-3">
                          {review.product?.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={review.product.image}
                              alt=""
                              className="h-12 w-12 rounded-xl object-cover ring-1 ring-stone-200"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold text-slate-900">
                              {review.product?.title || "Unknown product"}
                            </p>
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {review.shop?.name || "Unknown shop"}
                            </p>
                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {review.seller?.email || review.seller?.name || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        {review.sellerReply ? (
                          <>
                            <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                              {review.sellerReply}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(review.repliedAt)}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-400">No reply</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getStatusBadgeClass(
                            review.status,
                          )}`}
                        >
                          {review.status}
                        </span>
                        {review.hiddenAt && (
                          <p className="mt-2 text-xs text-slate-500">
                            Hidden {formatDate(review.hiddenAt)}
                          </p>
                        )}
                        {review.deletedAt && (
                          <p className="mt-2 text-xs text-slate-500">
                            Deleted {formatDate(review.deletedAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {review.status === "Hidden" ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({ type: "publish", review })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 text-emerald-700 transition hover:bg-emerald-50"
                              aria-label="Publish review"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          ) : (
                            review.status !== "Deleted" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAction({ type: "hide", review })
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 text-amber-700 transition hover:bg-amber-50"
                                aria-label="Hide review"
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            )
                          )}

                          {review.status !== "Deleted" && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({ type: "delete", review })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-700 transition hover:bg-red-50"
                              aria-label="Delete review"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && reviews.length === 0 && !error && (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No reviews found for the selected filters.
          </div>
        )}

        {pagination && (
          <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} -{" "}
              {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || isLoading}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                className="rounded-xl border border-stone-200 px-3 py-2 font-semibold transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border border-stone-200 px-3 py-2 font-semibold transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {pendingAction && actionCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-950">
              {actionCopy.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {actionCopy.body}
            </p>
            <div className="mt-4 rounded-xl bg-stone-50 p-3">
              <p className="text-sm font-bold text-slate-900">
                {pendingAction.review.title || "Untitled review"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {pendingAction.review.comment || "No written comment."}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isActing}
                onClick={() => setPendingAction(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActing}
                onClick={runAction}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionCopy.buttonClass}`}
              >
                {isActing ? "Working..." : actionCopy.button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
