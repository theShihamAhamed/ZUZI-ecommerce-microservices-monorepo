"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Star,
  Store,
} from "lucide-react";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/profile/order-status-badge";
import { OrderDeliveryTimeline } from "@/components/profile/order-delivery-timeline";
import { useMyOrderDetail } from "@/hooks/useOrder";
import { useProfile } from "@/hooks/useProfile";
import type { OrderDetailItem } from "@/types/order";
import { formatPrice } from "@/utils/price";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

const getErrorStatus = (error: unknown) => {
  return (error as any)?.response?.status as number | undefined;
};

const isAuthError = (error: unknown) => {
  const status = getErrorStatus(error);
  return status === 400 || status === 401 || status === 403;
};

function OrderItemReviewAction({ item }: { item: OrderDetailItem }) {
  if (item.reviewRequest?.canSubmit) {
    return (
      <Link
        href={`/reviews/submit/${item.reviewRequest.publicId}`}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
      >
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
        Submit Review
      </Link>
    );
  }

  if (item.reviewSubmitted || item.reviewRequest?.status === "Used") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Review submitted
      </span>
    );
  }

  if (item.reviewRequest?.status === "Expired") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600">
        <Clock className="h-3.5 w-3.5" />
        Review expired
      </span>
    );
  }

  return null;
}

export function ProfileOrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const profileQuery = useProfile();
  const orderQuery = useMyOrderDetail(orderId, Boolean(profileQuery.data));
  const shouldRedirectToLogin =
    profileQuery.isError && isAuthError(profileQuery.error);
  const order = orderQuery.data?.order;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/profile/orders/${orderId}`)}`,
      );
    }
  }, [orderId, router, shouldRedirectToLogin]);

  if (profileQuery.isLoading || orderQuery.isLoading || shouldRedirectToLogin) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-700" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Loading order
        </h1>
      </section>
    );
  }

  if (profileQuery.isError || orderQuery.isError || !order) {
    const status = getErrorStatus(orderQuery.error);

    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {status === 404 ? "Order not found" : "Unable to load order"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {status === 404
            ? "This order could not be found for your account."
            : "Please try again."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {status !== 404 ? (
            <button
              type="button"
              onClick={() => orderQuery.refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          ) : null}
          <Link
            href="/profile?tab=orders"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Back to orders
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/profile?tab=orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-amber-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="break-words text-2xl font-extrabold text-gray-900">
              {order.orderNumber || order.id}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Placed {formatDateTime(order.createdAt)}
            </p>
            {order.orderGroupId ? (
              <p className="mt-3 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
                Part of a multi-shop checkout
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <PaymentStatusBadge status={order.paymentStatus} />
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-stone-100 pt-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              Shop
            </p>
            <p className="mt-2 inline-flex max-w-full items-center gap-2 text-sm font-bold text-gray-900">
              <Store className="h-4 w-4 shrink-0 text-stone-400" />
              <span className="truncate">
                {order.shop?.name || "Zuzi seller"}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              Items
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900">
              {order.items.reduce((total, item) => total + item.quantity, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">
              Total
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900">
              {formatPrice(order.total)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">Items</h2>
        <div className="mt-5 divide-y divide-stone-100">
          {order.items.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 py-4 sm:grid-cols-[72px_minmax(0,1fr)_170px] sm:items-center"
            >
              <div className="h-[72px] w-[72px] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                <img
                  src={item.imageUrl || PRODUCT_PLACEHOLDER_IMAGE}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Qty {item.quantity} x {formatPrice(item.unitPrice)}
                </p>
                {item.selectedOptions ? (
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {Object.entries(item.selectedOptions)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(" | ")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <p className="text-sm font-extrabold text-gray-900 sm:text-right">
                  {formatPrice(item.total)}
                </p>
                <OrderItemReviewAction item={item} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">Shipping address</h2>
          {order.shippingAddressSnapshot ? (
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p className="font-bold text-gray-900">
                {order.shippingAddressSnapshot.fullName}
              </p>
              <p>{order.shippingAddressSnapshot.phone}</p>
              <p>{order.shippingAddressSnapshot.addressLine1}</p>
              {order.shippingAddressSnapshot.addressLine2 ? (
                <p>{order.shippingAddressSnapshot.addressLine2}</p>
              ) : null}
              <p>
                {[
                  order.shippingAddressSnapshot.city,
                  order.shippingAddressSnapshot.state,
                  order.shippingAddressSnapshot.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>{order.shippingAddressSnapshot.country}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">
              Shipping address is unavailable for this order.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">Summary</h2>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">
                {formatPrice(order.subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Discount</span>
              <span className="font-semibold text-gray-900">
                {formatPrice(order.discountAmount)}
              </span>
            </div>
            {order.couponCode ? (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Coupon</span>
                <span className="font-semibold text-gray-900">
                  {order.couponCode}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-stone-200 pt-3">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-extrabold text-gray-900">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">Delivery progress</h2>
        <p className="mt-1 text-sm text-gray-500">
          Track your order from placement to delivery.
        </p>
        <OrderDeliveryTimeline status={order.status} />
      </section>
    </div>
  );
}
