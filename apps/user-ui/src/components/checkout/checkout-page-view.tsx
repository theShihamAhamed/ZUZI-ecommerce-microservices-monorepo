"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { CheckoutPaymentForm } from "@/components/checkout/checkout-payment-form";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { useCreatePaymentSession } from "@/hooks/useOrder";
import { useProfile, useShippingAddresses } from "@/hooks/useProfile";
import { useCartStore } from "@/stores/cart.store";
import { CartItem } from "@/types/product";
import { ShippingAddress } from "@/types/profile";
import {
  CheckoutItemInput,
  CreatePaymentSessionResponse,
} from "@/types/order";
import { formatPrice, getCartSubtotal } from "@/utils/price";
import {
  getSelectedOptionsKey,
  normalizeSelectedOptions,
} from "@/utils/product-options";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

const getCheckoutErrorMessage = (error: unknown) => {
  return (
    (error as any)?.response?.data?.message ||
    (error as Error)?.message ||
    "Unable to prepare checkout right now."
  );
};

const getCheckoutItems = (cart: CartItem[]): CheckoutItemInput[] => {
  return cart.map((item) => {
    const selectedOptions = normalizeSelectedOptions(item.selectedOptions);
    const hasSelectedOptions = Object.keys(selectedOptions).length > 0;

    return {
      id: item.id,
      quantity: item.quantity || 1,
      ...(hasSelectedOptions ? { selectedOptions } : {}),
    };
  });
};

function AddressOption({
  address,
  checked,
  onSelect,
}: {
  address: ShippingAddress;
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-2xl border p-4 transition ${
        checked
          ? "border-amber-300 bg-amber-50/70"
          : "border-stone-200 bg-white hover:border-amber-200 hover:bg-amber-50/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name="shippingAddress"
          checked={checked}
          onChange={() => onSelect(address.id)}
          className="mt-1 h-4 w-4 accent-amber-700"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-900">{address.fullName}</p>
            {address.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Default
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-gray-600">{address.phone}</p>
          <p className="mt-2 break-words text-sm leading-6 text-gray-600">
            {[
              address.addressLine1,
              address.addressLine2,
              address.city,
              address.state,
              address.postalCode,
              address.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      </div>
    </label>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="h-48 animate-pulse rounded-2xl bg-white" />
        <div className="h-56 animate-pulse rounded-2xl bg-white" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}

export function CheckoutPageView() {
  const router = useRouter();
  const cart = useCartStore((state) => state.cart);
  const cartAppliedCouponCode = useCartStore(
    (state) => state.appliedCouponCode,
  );
  const profileQuery = useProfile();
  const addressesQuery = useShippingAddresses(Boolean(profileQuery.data));
  const createPaymentSession = useCreatePaymentSession();
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [paymentSession, setPaymentSession] =
    useState<CreatePaymentSessionResponse | null>(null);
  const [formError, setFormError] = useState("");
  const addresses = addressesQuery.data || [];
  const selectedAddress = addresses.find(
    (address) => address.id === selectedAddressId,
  );
  const cartSubtotal = getCartSubtotal(cart);
  const checkoutSignature = useMemo(
    () =>
      cart
        .map(
          (item) =>
            `${item.id}:${getSelectedOptionsKey(item.selectedOptions)}:${
              item.quantity || 1
            }`,
        )
        .sort()
        .join("|"),
    [cart],
  );
  const displaySummary = paymentSession?.summary || {
    subtotal: cartSubtotal,
    discountAmount: 0,
    total: cartSubtotal,
    currency: "usd",
    shops: [],
  };

  useEffect(() => {
    if (profileQuery.isError) {
      router.replace("/login?redirect=/checkout");
    }
  }, [profileQuery.isError, router]);

  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) {
      return;
    }

    const defaultAddress =
      addresses.find((address) => address.isDefault) || addresses[0];
    setSelectedAddressId(defaultAddress.id);
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    setPaymentSession(null);
    setFormError("");
  }, [appliedCouponCode, checkoutSignature, selectedAddressId]);

  useEffect(() => {
    if (!cartAppliedCouponCode) return;

    setCouponInput(cartAppliedCouponCode);
    setAppliedCouponCode(cartAppliedCouponCode);
  }, [cartAppliedCouponCode]);

  const handleApplyCoupon = () => {
    setAppliedCouponCode(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    setCouponInput("");
    setAppliedCouponCode("");
  };

  const handleCreatePaymentSession = async () => {
    setFormError("");

    if (!stripePromise) {
      setFormError("Stripe publishable key is not configured.");
      return;
    }

    if (cart.length === 0) {
      setFormError("Your cart is empty.");
      return;
    }

    if (!selectedAddressId) {
      setFormError("Select a shipping address before payment.");
      return;
    }

    try {
      const session = await createPaymentSession.mutateAsync({
        items: getCheckoutItems(cart),
        shippingAddressId: selectedAddressId,
        couponCode: appliedCouponCode || undefined,
      });

      setPaymentSession(session);
    } catch (error) {
      setPaymentSession(null);
      setFormError(getCheckoutErrorMessage(error));
    }
  };

  if (profileQuery.isLoading) {
    return (
      <main className="min-h-screen bg-stone-50 py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CheckoutSkeleton />
        </div>
      </main>
    );
  }

  if (profileQuery.isError) {
    return (
      <main className="min-h-screen bg-stone-50 py-8">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm font-medium text-gray-700 shadow-sm">
            Redirecting to login...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Cart", href: "/cart" },
            { label: "Checkout" },
          ]}
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Checkout
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              Confirm delivery details and complete secure payment.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm ring-1 ring-stone-200">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            Secure checkout
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <PackageCheck className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-gray-900">
              Your cart is empty
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              Add products to your cart before starting checkout.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="space-y-6">
              <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Shipping address
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose one of your saved destinations.
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
                  >
                    Manage addresses
                  </Link>
                </div>

                {addressesQuery.isLoading ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 2 }, (_, index) => (
                      <div
                        key={index}
                        className="h-36 animate-pulse rounded-2xl bg-stone-100"
                      />
                    ))}
                  </div>
                ) : null}

                {addressesQuery.isError ? (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    Unable to load shipping addresses right now.
                  </div>
                ) : null}

                {!addressesQuery.isLoading &&
                !addressesQuery.isError &&
                addresses.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                    <MapPin className="mx-auto h-8 w-8 text-amber-700" />
                    <h3 className="mt-3 text-base font-bold text-gray-900">
                      Add a shipping address
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                      Checkout needs a saved delivery address before payment.
                    </p>
                    <Link
                      href="/profile"
                      className="mt-5 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      Add address
                    </Link>
                  </div>
                ) : null}

                {!addressesQuery.isLoading &&
                !addressesQuery.isError &&
                addresses.length > 0 ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {addresses.map((address) => (
                      <AddressOption
                        key={address.id}
                        address={address}
                        checked={address.id === selectedAddressId}
                        onSelect={setSelectedAddressId}
                      />
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-700" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Payment
                  </h2>
                </div>

                {!stripePromise ? (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    Stripe publishable key is not configured.
                  </div>
                ) : null}

                {formError ? (
                  <div className="mt-5 flex gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                ) : null}

                {!paymentSession ? (
                  <button
                    type="button"
                    onClick={handleCreatePaymentSession}
                    disabled={
                      createPaymentSession.isPending ||
                      !selectedAddress ||
                      !stripePromise
                    }
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {createPaymentSession.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {createPaymentSession.isPending
                      ? "Preparing payment..."
                      : "Continue to payment"}
                  </button>
                ) : null}

                {paymentSession && stripePromise ? (
                  <div className="mt-5">
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret: paymentSession.clientSecret,
                        appearance: {
                          theme: "stripe",
                          variables: {
                            colorPrimary: "#d97706",
                            borderRadius: "12px",
                          },
                        },
                      }}
                    >
                      <CheckoutPaymentForm
                        sessionId={paymentSession.sessionId}
                        onError={setFormError}
                      />
                    </Elements>
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
              <h2 className="text-lg font-bold text-gray-900">
                Order summary
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                The final amount is calculated again on the server.
              </p>

              <div className="mt-5 space-y-3 border-t border-stone-200 pt-5">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(displaySummary.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Discount</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(displaySummary.discountAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-stone-200 pt-5">
                <label
                  htmlFor="checkout-coupon-code"
                  className="text-sm font-semibold text-gray-900"
                >
                  Coupon code
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="checkout-coupon-code"
                    type="text"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="Enter coupon"
                    className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Tag className="h-4 w-4" />
                    Apply
                  </button>
                </div>
                {appliedCouponCode ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <span className="min-w-0 truncate font-semibold">
                      {appliedCouponCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="shrink-0 font-bold hover:text-amber-950"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-5">
                <span className="text-base font-bold text-gray-900">
                  Total
                </span>
                <span className="text-xl font-extrabold text-gray-900">
                  {formatPrice(displaySummary.total)}
                </span>
              </div>

              <div className="mt-5 space-y-3 border-t border-stone-200 pt-5">
                {cart.map((item) => (
                  <div
                    key={`${item.id}:${getSelectedOptionsKey(
                      item.selectedOptions,
                    )}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Qty {item.quantity || 1}
                      </p>
                      {Object.entries(item.selectedOptions || {}).length > 0 ? (
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {Object.entries(item.selectedOptions || {})
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" | ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-bold text-gray-900">
                      {formatPrice(item.sale_price * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
