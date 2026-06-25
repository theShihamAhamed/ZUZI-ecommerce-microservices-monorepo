"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { useVerifyPaymentSession } from "@/hooks/useOrder";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cart.store";
import { formatPrice } from "@/utils/price";

export function CheckoutSuccessView() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";
  const clearCart = useCartStore((state) => state.clearCart);
  const { fetchUser } = useAuth();
  const hasClearedCart = useRef(false);
  const [showWebhookHint, setShowWebhookHint] = useState(false);
  const verifyQuery = useVerifyPaymentSession(sessionId, Boolean(sessionId));
  const result = verifyQuery.data;
  const isOrderCreated =
    result?.valid &&
    result.paymentStatus === "Succeeded" &&
    result.orderCreated === true;
  const isOrderFinalizing =
    result?.valid &&
    result.paymentStatus === "Succeeded" &&
    result.orderCreated === false;
  const isPaymentPending = result?.valid && result.paymentStatus === "Pending";
  const isPaymentFailed =
    result?.valid &&
    (result.paymentStatus === "Failed" || result.paymentStatus === "Refunded");
  const isWaitingForOrder = isOrderFinalizing || isPaymentPending;

  useEffect(() => {
    if (!isOrderFinalizing) {
      setShowWebhookHint(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowWebhookHint(true);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [isOrderFinalizing]);

  useEffect(() => {
    if (
      !isOrderCreated ||
      hasClearedCart.current ||
      fetchUser.isLoading
    ) {
      return;
    }

    hasClearedCart.current = true;
    void clearCart(fetchUser.data);
  }, [clearCart, fetchUser.data, fetchUser.isLoading, isOrderCreated]);

  if (!sessionId) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
          Payment session missing
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          We could not verify this checkout without a payment session.
        </p>
        <Link
          href="/cart"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Return to cart
        </Link>
      </section>
    );
  }

  if (verifyQuery.isLoading) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
          Verifying payment
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          Checking your payment and order status.
        </p>
      </section>
    );
  }

  if (verifyQuery.isError || !result?.valid) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
          Unable to verify payment
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          {result?.message ||
            "The payment session could not be verified right now."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => verifyQuery.refetch()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Return to cart
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          isOrderCreated
            ? "bg-green-50 text-green-700"
            : isPaymentFailed
              ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {isOrderCreated ? (
          <CheckCircle2 className="h-8 w-8" />
        ) : isPaymentFailed ? (
          <AlertCircle className="h-8 w-8" />
        ) : (
          <PackageCheck className="h-8 w-8" />
        )}
      </div>

      <h1 className="mt-5 text-2xl font-extrabold text-gray-900 sm:text-3xl">
        {isOrderCreated
          ? "Payment successful"
          : isPaymentFailed
            ? "Payment not completed"
            : isPaymentPending
              ? "Payment pending"
              : "Payment received"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 sm:text-base">
        {isOrderCreated
          ? "Your order has been created successfully."
          : isPaymentFailed
            ? result.message || "The payment was not completed."
            : isPaymentPending
              ? "Your payment is still processing. We will keep checking the status."
              : result.message ||
                "Payment received. We are finalizing your order."}
      </p>

      {showWebhookHint ? (
        <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
          Order is still finalizing. In local development, check that Stripe CLI
          is forwarding to <span className="font-semibold">/api/create-order</span>.
        </div>
      ) : null}

      {result.summary ? (
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(result.summary.subtotal)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <span>Discount</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(result.summary.discountAmount)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
            <span className="font-bold text-gray-900">Total</span>
            <span className="text-lg font-extrabold text-gray-900">
              {formatPrice(result.summary.total)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {isWaitingForOrder ? (
          <button
            type="button"
            onClick={() => verifyQuery.refetch()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Check again
          </button>
        ) : null}
        {isPaymentFailed ? (
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Return to cart
          </Link>
        ) : (
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Continue shopping
          </Link>
        )}
      </div>
    </section>
  );
}
