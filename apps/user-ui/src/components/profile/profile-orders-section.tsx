"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  RefreshCw,
  Star,
  Store,
} from "lucide-react";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/profile/order-status-badge";
import { useMyOrders } from "@/hooks/useOrder";
import type { CustomerOrderListItem } from "@/types/order";
import { formatPrice } from "@/utils/price";

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));

const getPendingReviewRequests = (
  reviewRequests: CustomerOrderListItem["reviewRequests"],
) => (reviewRequests || []).filter((request) => request.canSubmit);

function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="h-5 w-40 animate-pulse rounded-full bg-stone-200" />
      <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded-full bg-stone-100" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
      </div>
    </div>
  );
}

export function ProfileOrdersSection() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const ordersQuery = useMyOrders({ page, limit });
  const orders = ordersQuery.data?.orders || [];
  const pagination = ordersQuery.data?.pagination;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your paid orders and delivery progress.
          </p>
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {ordersQuery.isError ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Unable to load orders
          </h3>
          <p className="mt-2 text-sm text-gray-600">Please try again.</p>
          <button
            type="button"
            onClick={() => ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {ordersQuery.isFetching ? "Trying again..." : "Retry"}
          </button>
        </div>
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-gray-900">
            No orders yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Orders from your completed checkouts will appear here.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Browse products
          </Link>
        </div>
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const pendingReviewRequests = getPendingReviewRequests(
              order.reviewRequests,
            );
            const hasSinglePendingReview = pendingReviewRequests.length === 1;
            const hasMultiplePendingReviews = pendingReviewRequests.length > 1;
            const allItemsReviewed =
              Boolean(order.reviewableItemCount) &&
              order.reviewSubmittedCount === order.reviewableItemCount;

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-base font-bold text-gray-900">
                        {order.orderNumber || order.id}
                      </h3>
                      {order.orderGroupId ? (
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                          Multi-shop checkout
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Placed {formatDate(order.createdAt)}
                    </p>
                    <p className="mt-3 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-gray-600">
                      <Store className="h-4 w-4 shrink-0 text-stone-400" />
                      <span className="truncate">
                        {order.shop?.name || "Zuzi seller"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allItemsReviewed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reviewed
                      </span>
                    ) : null}
                    <PaymentStatusBadge status={order.paymentStatus} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 border-t border-stone-100 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Items
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {order.itemCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Total
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Shipping
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-700">
                      {order.shippingSummary?.line || "Saved address"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
                  {hasSinglePendingReview ? (
                    <Link
                      href={`/reviews/submit/${pendingReviewRequests[0].publicId}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      Submit Review
                    </Link>
                  ) : null}
                  {hasMultiplePendingReviews ? (
                    <Link
                      href={`/profile/orders/${order.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      Submit Reviews ({pendingReviewRequests.length})
                    </Link>
                  ) : null}
                  <Link
                    href={`/profile/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    View details
                  </Link>
                </div>
              </article>
            );
          })}

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
    </section>
  );
}
