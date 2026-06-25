"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCartSummary } from "@/hooks/useCart";
import { useCartStore } from "@/stores/cart.store";
import { CartItem } from "@/types/product";
import { formatPrice, getCartSubtotal } from "@/utils/price";
import { getSelectedOptionsKey } from "@/utils/product-options";

interface CartSummaryProps {
  cart: CartItem[];
}

export function CartSummary({ cart }: CartSummaryProps) {
  const { fetchUser } = useAuth();
  const clearCart = useCartStore((state) => state.clearCart);
  const appliedCouponCode = useCartStore((state) => state.appliedCouponCode);
  const discountAmount = useCartStore((state) => state.discountAmount);
  const trustedSubtotal = useCartStore((state) => state.trustedSubtotal);
  const trustedTotal = useCartStore((state) => state.trustedTotal);
  const couponMessage = useCartStore((state) => state.couponMessage);
  const setAppliedCoupon = useCartStore((state) => state.setAppliedCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const cartSummary = useCartSummary();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const localSubtotal = getCartSubtotal(cart);
  const subtotal = trustedSubtotal ?? localSubtotal;
  const discount = discountAmount;
  const total = trustedTotal ?? Math.max(localSubtotal - discount, 0);
  const trimmedCouponInput = couponInput.trim();
  const isApplyDisabled =
    !trimmedCouponInput ||
    cart.length === 0 ||
    cartSummary.isPending ||
    fetchUser.isLoading ||
    !fetchUser.data;

  useEffect(() => {
    if (cart.length === 0 && appliedCouponCode) {
      clearCoupon();
    }
  }, [appliedCouponCode, cart.length, clearCoupon]);

  const handleClearCart = async () => {
    setIsClearing(true);
    setCouponInput("");
    setCouponError("");

    try {
      await clearCart(fetchUser.data);
    } finally {
      setIsClearing(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (isApplyDisabled) return;

    setCouponError("");

    try {
      const response = await cartSummary.mutateAsync({
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity || 1,
          selectedOptions: item.selectedOptions || null,
          selectedOptionsKey: getSelectedOptionsKey(item.selectedOptions),
        })),
        couponCode: trimmedCouponInput,
      });

      setAppliedCoupon({
        couponCode: response.data.coupon?.code || trimmedCouponInput,
        subtotal: response.data.subtotal,
        discountAmount: response.data.discountAmount,
        total: response.data.total,
        message: response.data.coupon?.message || "Coupon applied.",
      });
      setCouponInput(response.data.coupon?.code || trimmedCouponInput);
    } catch (error) {
      const message =
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        "Unable to apply coupon.";
      clearCoupon();
      setCouponError(message);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput("");
    setCouponError("");
    clearCoupon();
  };

  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
      <h2 className="text-lg font-bold text-gray-900">Order summary</h2>
      <p className="mt-1 text-sm text-gray-600">
        Review your cart before checkout becomes available.
      </p>

      <div className="mt-5 space-y-3 border-t border-stone-200 pt-5">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span className="font-semibold text-gray-900">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Discount</span>
          <span className="font-semibold text-green-700">
            {discount > 0 ? `-${formatPrice(discount)}` : formatPrice(0)}
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-stone-200 pt-5">
        <label
          htmlFor="coupon-code"
          className="text-sm font-semibold text-gray-900"
        >
          Coupon code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="coupon-code"
            type="text"
            value={couponInput}
            onChange={(event) => {
              setCouponInput(event.target.value);
              setCouponError("");
            }}
            disabled={cartSummary.isPending}
            placeholder="Enter coupon"
            className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-stone-50"
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={isApplyDisabled}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-gray-500"
          >
            {cartSummary.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Tag className="h-4 w-4" />
            )}
            Apply
          </button>
        </div>
        {!fetchUser.isLoading && !fetchUser.data ? (
          <p className="mt-2 flex gap-1.5 text-xs font-medium text-amber-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Sign in to apply a coupon.
          </p>
        ) : null}
        {cartSummary.isPending ? (
          <p className="mt-2 text-xs font-medium text-gray-500">
            Applying coupon...
          </p>
        ) : null}
        {couponError ? (
          <p className="mt-2 flex gap-1.5 text-xs font-medium text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {couponError}
          </p>
        ) : null}
        {couponMessage && !couponError ? (
          <p className="mt-2 flex gap-1.5 text-xs font-medium text-amber-700">
            {appliedCouponCode ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {couponMessage}
          </p>
        ) : null}
        {appliedCouponCode ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span className="min-w-0 truncate font-semibold">
              {appliedCouponCode}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="inline-flex shrink-0 items-center gap-1 font-bold hover:text-amber-950"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-5">
        <span className="text-base font-bold text-gray-900">Total</span>
        <span className="text-xl font-extrabold text-gray-900">
          {formatPrice(total)}
        </span>
      </div>

      <Link
        href="/checkout"
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
      >
        Proceed to checkout
      </Link>

      <button
        type="button"
        onClick={handleClearCart}
        disabled={isClearing || fetchUser.isLoading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isClearing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {isClearing ? "Clearing cart..." : "Clear cart"}
      </button>
    </aside>
  );
}
