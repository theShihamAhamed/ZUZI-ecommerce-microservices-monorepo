"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Timer,
} from "lucide-react";
import { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { sendKafkaEvent } from "@/actions/send-kafka-event";
import {
  buildProductAnalyticsEvent,
  getAnalyticsDeviceLabel,
  getAnalyticsLocationLabel,
} from "@/services/analytics-event.service";
import { getProductEventInfo } from "@/utils/product-event";
import { formatPrice, getDisplayProductPricing } from "@/utils/price";
import { ProductDeliverySellerCard } from "@/components/products/product-delivery-seller-card";
import { ProductDetailGallery } from "@/components/products/product-detail-gallery";
import { ProductOptionSelector } from "@/components/products/product-option-selector";
import { ProductRatingStars } from "@/components/products/product-rating-stars";
import { SelectedProductOptions } from "@/types/product";
import {
  getMissingRequiredProductOptions,
  getProductOptionGroups,
  normalizeSelectedOptions,
} from "@/utils/product-options";

interface ProductDetailViewProps {
  product: Product;
}

const getDiscountPercentage = (regularPrice: number, salePrice: number) => {
  if (regularPrice <= 0 || regularPrice <= salePrice) {
    return 0;
  }

  return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] =
    useState<SelectedProductOptions>({});
  const [optionError, setOptionError] = useState("");
  const hasTrackedView = useRef(false);
  const addToCartWithQuantity = useCartStore(
    (state) => state.addToCartWithQuantity,
  );
  const isInCart = useCartStore((state) =>
    state.isInCart(product.id, selectedOptions),
  );
  const addToWishlistWithQuantity = useWishlistStore(
    (state) => state.addToWishlistWithQuantity,
  );
  const removeFromWishlist = useWishlistStore(
    (state) => state.removeFromWishlist,
  );
  const isInWishlist = useWishlistStore((state) =>
    state.isInWishlist(product.id),
  );
  const maxQuantity = product.stock > 0 ? product.stock : 1;
  const isOutOfStock = product.stock <= 0;
  const eventInfo = getProductEventInfo(product);
  const pricing = getDisplayProductPricing(product);
  const savedAmount =
    pricing.compareAtPrice && pricing.displayPrice
      ? pricing.compareAtPrice - pricing.displayPrice
      : 0;
  const discountPercentage =
    pricing.compareAtPrice && pricing.displayPrice
      ? getDiscountPercentage(pricing.compareAtPrice, pricing.displayPrice)
      : 0;
  const eventBadgeLabel = pricing.isEventPriceActive
    ? "Event Offer"
    : pricing.eventStatus === "active"
      ? "Event Live"
      : pricing.eventStatus === "upcoming"
        ? "Upcoming Event"
        : "";
  const user = fetchUser.data;
  const optionGroups = useMemo(() => getProductOptionGroups(product), [product]);

  const productBadges = useMemo(
    () =>
      [
        product.category,
        product.subCategory,
        product.brand ? `Brand: ${product.brand}` : null,
      ].filter(isNonEmptyString),
    [product.brand, product.category, product.subCategory],
  );

  useEffect(() => {
    if (hasTrackedView.current || location.isLoading) return;

    hasTrackedView.current = true;
    void sendKafkaEvent(
      buildProductAnalyticsEvent({
        product,
        user,
        location,
        deviceInfo,
        action: "product_view",
      }),
    );
  }, [deviceInfo, location, product, user]);

  useEffect(() => {
    setQuantity(1);
    setSelectedOptions({});
    setOptionError("");
  }, [product.id]);

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  };

  const handleOptionChange = (nextOptions: SelectedProductOptions) => {
    setSelectedOptions(nextOptions);
    setOptionError("");
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    const normalizedSelectedOptions =
      normalizeSelectedOptions(selectedOptions);
    const missingOptions = getMissingRequiredProductOptions(
      optionGroups,
      normalizedSelectedOptions,
    );

    if (missingOptions.length > 0) {
      setOptionError(`Select ${missingOptions.join(", ")} before adding.`);
      return;
    }

    addToCartWithQuantity(
      product,
      quantity,
      user,
      getAnalyticsLocationLabel(location),
      getAnalyticsDeviceLabel(deviceInfo),
      normalizedSelectedOptions,
    );
    void sendKafkaEvent(
      buildProductAnalyticsEvent({
        product,
        user,
        location,
        deviceInfo,
        action: "add_to_cart",
      }),
    );
  };

  const handleWishlistClick = () => {
    if (isInWishlist) {
      removeFromWishlist(product.id);
      void sendKafkaEvent(
        buildProductAnalyticsEvent({
          product,
          user,
          location,
          deviceInfo,
          action: "remove_from_wishlist",
        }),
      );
      return;
    }

    addToWishlistWithQuantity(
      product,
      quantity,
      user,
      getAnalyticsLocationLabel(location),
      getAnalyticsDeviceLabel(deviceInfo),
    );
    void sendKafkaEvent(
      buildProductAnalyticsEvent({
        product,
        user,
        location,
        deviceInfo,
        action: "add_to_wishlist",
      }),
    );
  };

  return (
    <section className="bg-stone-50 py-8 sm:py-10 lg:py-12">
      <div className="mx-auto grid min-w-0 max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:px-8">
        <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
            <ProductDetailGallery
              images={product.images}
              title={product.title}
            />

            <div className="min-w-0">
              {productBadges.length > 0 ? (
                <div className="flex min-w-0 flex-wrap gap-2">
                  {productBadges.map((badge) => (
                    <span
                      key={badge}
                      className="max-w-full break-words rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}

              <h1 className="mt-4 max-w-full break-words text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl">
                {product.title}
              </h1>

              <p className="mt-3 max-w-full break-words text-sm leading-6 text-gray-600 sm:text-base">
                {product.short_description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <ProductRatingStars rating={product.ratings} />
                <span>{product.totalSales || 0} sold</span>
              </div>

              {eventBadgeLabel ? (
                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
                  <Timer className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <span className="truncate">
                    {eventBadgeLabel}
                    {eventInfo.remainingText
                      ? ` - ${eventInfo.label} ${eventInfo.remainingText}`
                      : ""}
                  </span>
                </div>
              ) : null}

              {eventInfo.isEventProduct ? (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <CalendarDays className="h-4 w-4 text-amber-700" />
                    Event schedule
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Status
                      </p>
                      <p className="mt-1 font-semibold capitalize">
                        {pricing.eventStatus === "ended"
                          ? "Ended"
                          : pricing.eventStatus}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Starts
                      </p>
                      <p className="mt-1 font-semibold">
                        {eventInfo.startText || "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Ends
                      </p>
                      <p className="mt-1 font-semibold">
                        {eventInfo.endText || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-baseline gap-3">
                {pricing.displayPrice ? (
                  <span className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                    {formatPrice(pricing.displayPrice)}
                  </span>
                ) : null}
                {savedAmount > 0 ? (
                  <span className="text-base text-gray-400 line-through">
                    {formatPrice(pricing.compareAtPrice)}
                  </span>
                ) : null}
                {discountPercentage > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    <BadgePercent className="h-3.5 w-3.5" />
                    {discountPercentage}% off
                  </span>
                ) : null}
                {pricing.isEventPriceActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                    Event price active
                  </span>
                ) : null}
              </div>

              {pricing.eventStatus === "upcoming" && pricing.eventSalePrice ? (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Event price starts soon. Current price remains the normal
                  buying price.
                </p>
              ) : null}

              <ProductOptionSelector
                optionGroups={optionGroups}
                selectedOptions={selectedOptions}
                onChange={handleOptionChange}
                error={optionError}
              />

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center rounded-full border border-stone-200 bg-stone-50">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:text-amber-700 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 text-center text-sm font-semibold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={quantity >= maxQuantity || isOutOfStock}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:text-amber-700 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isOutOfStock
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of stock"
                    : `${product.stock} in stock`}
                </span>
              </div>

              <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="truncate">
                    {isInCart ? "Add more to cart" : "Add to cart"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleWishlistClick}
                  className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition ${
                    isInWishlist
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-stone-200 bg-white text-gray-900 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isInWishlist ? "fill-amber-500" : ""
                    }`}
                  />
                  <span className="truncate">
                    {isInWishlist ? "Remove wishlist" : "Add to wishlist"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <ProductDeliverySellerCard product={product} location={location} />
      </div>
    </section>
  );
}
