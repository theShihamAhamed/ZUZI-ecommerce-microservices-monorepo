"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Loader2, RefreshCw } from "lucide-react";
import {
  useSellerOrderDetail,
  useUpdateSellerOrderStatus,
} from "@/hooks/useOrder";
import { SellerOrderStatus } from "@/types/order";
import {
  deliverySteps,
  getOrderStatusLabel,
  getStatusStyle,
  normalizeOrderStatus,
} from "@/lib/order-status";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? price : 0);

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));

function SellerDeliveryTimeline({ status }: { status: SellerOrderStatus }) {
  const normalizedStatus = normalizeOrderStatus(status);
  const activeIndex = Math.max(
    0,
    deliverySteps.findIndex((step) => step.status === normalizedStatus),
  );

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-5 md:gap-0">
      {deliverySteps.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isAchieved = index <= activeIndex;

        return (
          <div
            key={step.status}
            className="relative flex gap-3 md:flex-col md:items-center md:gap-2"
          >
            {index > 0 ? (
              <div
                className={`absolute left-[15px] top-[-18px] h-5 w-0.5 md:left-[-50%] md:top-4 md:h-0.5 md:w-full ${
                  isAchieved ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ) : null}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                isCompleted
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : isCurrent
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100"
                    : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0 md:text-center">
              <p
                className={`text-sm ${
                  isCurrent ? "font-bold text-slate-950" : "font-semibold"
                } ${isAchieved ? "text-slate-900" : "text-slate-500"}`}
              >
                {step.label}
              </p>
              <p
                className={`mt-1 text-xs ${
                  isAchieved ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {step.helper}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SellerOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const orderQuery = useSellerOrderDetail(orderId);
  const updateStatus = useUpdateSellerOrderStatus(orderId);
  const [errorMessage, setErrorMessage] = useState("");
  const order = orderQuery.data?.order;
  const allowedNextStatuses = orderQuery.data?.allowedNextStatuses || [];
  const nextStatus = allowedNextStatuses[0];

  const handleStatusUpdate = async (status: SellerOrderStatus) => {
    setErrorMessage("");

    try {
      await updateStatus.mutateAsync(status);
    } catch (error) {
      setErrorMessage(
        (error as any)?.response?.data?.message ||
          "Unable to update order status.",
      );
    }
  };

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen p-6 text-slate-900">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            Loading order
          </h1>
        </div>
      </div>
    );
  }

  if (orderQuery.isError || !order) {
    const status = (orderQuery.error as any)?.response?.status;

    return (
      <div className="min-h-screen p-6 text-slate-900">
        <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            {status === 404 ? "Order not found" : "Unable to load order"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {status === 404
              ? "This order is not available for your shop."
              : "Please try again."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {status !== 404 ? (
              <button
                type="button"
                onClick={() => orderQuery.refetch()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            ) : null}
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Back to orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-slate-900">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="break-words text-2xl font-semibold text-slate-950">
              {order.orderNumber || order.id}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Placed {formatDateTime(order.createdAt)}
            </p>
            {order.orderGroupId ? (
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                Multi-shop checkout
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                order.status,
              )}`}
            >
              {getOrderStatusLabel(order.status)}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                order.paymentStatus,
              )}`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Items</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {order.items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 py-4 md:grid-cols-[72px_minmax(0,1fr)_120px] md:items-center"
                >
                  <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Qty {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                    {item.selectedOptions ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {Object.entries(item.selectedOptions)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" | ")}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-slate-950 md:text-right">
                    {formatPrice(item.total)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Delivery progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Move the order forward one fulfillment step at a time.
            </p>
            <SellerDeliveryTimeline status={order.status} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Fulfillment address
            </h2>
            {order.shippingAddressSnapshot ? (
              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-950">
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
              <p className="mt-4 text-sm text-slate-500">
                Shipping details are unavailable.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>{formatPrice(order.discountAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-950">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Update status
            </h2>
            {errorMessage ? (
              <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {nextStatus ? (
              <button
                type="button"
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={updateStatus.isPending}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateStatus.isPending
                  ? "Updating..."
                  : `Mark as ${getOrderStatusLabel(nextStatus)}`}
              </button>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                This order has completed its delivery lifecycle.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
