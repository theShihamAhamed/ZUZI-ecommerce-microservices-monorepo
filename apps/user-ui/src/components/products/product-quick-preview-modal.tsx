"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Store,
  Timer,
  X,
} from "lucide-react";
import { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { getEstimatedDeliveryText } from "@/utils/delivery-date";
import { sendKafkaEvent } from "@/actions/send-kafka-event";
import {
  AnalyticsDevice,
  AnalyticsLocation,
  buildProductAnalyticsEvent,
  getAnalyticsDeviceLabel,
  getAnalyticsLocationLabel,
} from "@/services/analytics-event.service";
import { ProductOptionSelector } from "@/components/products/product-option-selector";
import { SelectedProductOptions } from "@/types/product";
import {
  getMissingRequiredProductOptions,
  getProductOptionGroups,
  normalizeSelectedOptions,
} from "@/utils/product-options";
import { ChatWithSellerButton } from "@/components/chat/chat-with-seller-button";
import { getProductEventInfo } from "@/utils/product-event";
import { formatPrice, getDisplayProductPricing } from "@/utils/price";
import { getProductThumbnail, getShopAvatarUrl } from "@/utils/image-assets";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

interface ProductQuickPreviewModalProps {
  product: Product;
  user?: any;
  location: AnalyticsLocation;
  deviceInfo: AnalyticsDevice;
  isOpen: boolean;
  onClose: () => void;
}

const getShopInitials = (name?: string) => {
  if (!name) return "ZS";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export function ProductQuickPreviewModal({
  product,
  user,
  location,
  deviceInfo,
  isOpen,
  onClose,
}: ProductQuickPreviewModalProps) {
  const images = product.images || [];
  const [selectedImage, setSelectedImage] = useState(
    getProductThumbnail(product) || PRODUCT_PLACEHOLDER_IMAGE,
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] =
    useState<SelectedProductOptions>({});
  const [optionError, setOptionError] = useState("");
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
  const shopId = product.shop?.id || product.shopId;
  const shopHref = shopId ? `/shops/${shopId}` : "#";
  const shopAvatarUrl = getShopAvatarUrl(product.shop);
  const maxQuantity = product.stock > 0 ? product.stock : 1;
  const isOutOfStock = product.stock <= 0;
  const deliveryText = useMemo(() => getEstimatedDeliveryText(), []);
  const optionGroups = useMemo(() => getProductOptionGroups(product), [product]);
  const pricing = getDisplayProductPricing(product);
  const eventInfo = getProductEventInfo(product);
  const savedAmount =
    pricing.compareAtPrice && pricing.displayPrice
      ? pricing.compareAtPrice - pricing.displayPrice
      : 0;
  const eventBadgeLabel = pricing.isEventPriceActive
    ? "Event Offer"
    : pricing.eventStatus === "active"
      ? "Event Live"
      : pricing.eventStatus === "upcoming"
        ? "Upcoming Event"
        : "";

  useEffect(() => {
    setSelectedImage(getProductThumbnail(product) || PRODUCT_PLACEHOLDER_IMAGE);
    setQuantity(1);
    setSelectedOptions({});
    setOptionError("");
  }, [images, product.id]);

  useEffect(() => {
    if (!isOpen) return;

    void sendKafkaEvent(
      buildProductAnalyticsEvent({
        product,
        user,
        location,
        deviceInfo,
        action: "product_view",
      }),
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deviceInfo, isOpen, location, onClose, product, user]);

  if (!isOpen) return null;

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseSelectedQuantity = () => {
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 px-3 py-4 sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick preview for ${product.title}`}
      onMouseDown={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto overflow-x-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick preview"
          className="sticky right-2 top-2 z-10  flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 shadow-sm transition hover:text-amber-700 sm:absolute sm:right-4 sm:top-4 sm:mr-0"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-0 lg:grid-cols-[1fr_0.95fr]">
          <div className="bg-stone-50 p-4 sm:p-6 lg:p-8">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <img
                src={selectedImage}
                alt={product.title}
                className="aspect-square w-full bg-stone-100 object-cover"
              />
            </div>

            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image) => (
                  <button
                    type="button"
                    key={image.fileId || image.url}
                    onClick={() => setSelectedImage(image.url)}
                    className={`overflow-hidden rounded-xl border bg-white ${
                      selectedImage === image.url
                        ? "border-amber-400 ring-2 ring-amber-200"
                        : "border-stone-200"
                    }`}
                    aria-label={`Preview image for ${product.title}`}
                  >
                    <img
                      src={image.url}
                      alt={product.title}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="p-5 pt-2 sm:p-6 lg:p-8">
            <div className="flex items-center gap-4 pr-10">
              {shopAvatarUrl ? (
                <img
                  src={shopAvatarUrl}
                  alt={product.shop?.name || "Shop avatar"}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-700">
                  {getShopInitials(product.shop?.name)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <Link
                  href={shopHref}
                  className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-gray-900 transition hover:text-amber-700"
                >
                  <Store className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="truncate">
                    {product.shop?.name || "Zuzi seller"}
                  </span>
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {typeof product.shop?.ratings === "number" ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {product.shop.ratings.toFixed(1)}
                    </span>
                  ) : null}
                  <span>{product.shop?.address || "Marketplace seller"}</span>
                </div>
              </div>

              <ChatWithSellerButton
                product={product}
                label="Chat with seller"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="my-4 border-t border-stone-200" />

            <h2 className="break-words text-2xl font-extrabold text-gray-900">
              {product.title}
            </h2>
            <p className="mt-3 break-words text-sm leading-6 text-gray-600">
              {product.short_description}
            </p>

            {product.brand ? (
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Brand:</span>{" "}
                {product.brand}
              </p>
            ) : null}

            <ProductOptionSelector
              optionGroups={optionGroups}
              selectedOptions={selectedOptions}
              onChange={handleOptionChange}
              error={optionError}
            />

            {eventBadgeLabel ? (
              <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                <Timer className="h-3.5 w-3.5 shrink-0" />
                <span>{eventBadgeLabel}</span>
                {eventInfo.remainingText ? (
                  <span className="text-amber-600">
                    {eventInfo.remainingText}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              {pricing.displayPrice ? (
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatPrice(pricing.displayPrice)}
                </span>
              ) : null}
              {savedAmount > 0 ? (
                <span className="text-base text-gray-400 line-through">
                  {formatPrice(pricing.compareAtPrice)}
                </span>
              ) : null}
              {pricing.isEventPriceActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  <BadgePercent className="h-3.5 w-3.5" />
                  Event price
                </span>
              ) : null}
            </div>

            {pricing.eventStatus === "upcoming" && pricing.eventSalePrice ? (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Event price starts soon.
              </p>
            ) : null}

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
                  onClick={increaseSelectedQuantity}
                  disabled={quantity >= maxQuantity || isOutOfStock}
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 items-center justify-center text-gray-700 transition hover:text-amber-700 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isOutOfStock
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isOutOfStock ? "Out of stock" : "In stock"}
              </span>
            </div>

            <p className="mt-4 text-sm text-gray-500">{deliveryText}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {isInCart ? "Add more to cart" : "Add to cart"}
              </button>

              <button
                type="button"
                onClick={handleWishlistClick}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${
                  isInWishlist
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-stone-200 bg-white text-gray-900 hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${isInWishlist ? "fill-amber-500" : ""}`}
                />
                {isInWishlist ? "Remove wishlist" : "Add to wishlist"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
