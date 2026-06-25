"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgePercent,
  Eye,
  Heart,
  ShoppingCart,
  Star,
  Store,
  Timer,
} from "lucide-react";
import { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { ProductQuickPreviewModal } from "@/components/products/product-quick-preview-modal";
import { getProductEventInfo } from "@/utils/product-event";
import { formatPrice, getDisplayProductPricing } from "@/utils/price";
import { sendKafkaEvent } from "@/actions/send-kafka-event";
import {
  AnalyticsDevice,
  AnalyticsLocation,
  buildProductAnalyticsEvent,
  getAnalyticsDeviceLabel,
  getAnalyticsLocationLabel,
} from "@/services/analytics-event.service";
import {
  getProductOptionGroups,
  hasRequiredProductOptions,
} from "@/utils/product-options";
import { getProductThumbnail } from "@/utils/image-assets";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

interface ProductCardProps {
  product: Product;
  user?: any;
  location: AnalyticsLocation;
  deviceInfo: AnalyticsDevice;
}

export function ProductCard({
  product,
  user,
  location,
  deviceInfo,
}: ProductCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const addToCart = useCartStore((state) => state.addToCart);
  const isInCart = useCartStore((state) => state.isInCart(product.id));
  const addToWishlist = useWishlistStore((state) => state.addToWishlist);
  const removeFromWishlist = useWishlistStore(
    (state) => state.removeFromWishlist,
  );
  const isInWishlist = useWishlistStore((state) =>
    state.isInWishlist(product.id),
  );
  const eventInfo = getProductEventInfo(product);
  const pricing = getDisplayProductPricing(product);
  const optionGroups = useMemo(() => getProductOptionGroups(product), [product]);
  const requiresOptionSelection = hasRequiredProductOptions(optionGroups);
  const thumbnail = getProductThumbnail(product) || PRODUCT_PLACEHOLDER_IMAGE;
  const savedAmount =
    pricing.compareAtPrice && pricing.displayPrice
      ? pricing.compareAtPrice - pricing.displayPrice
      : 0;
  const hasSavings = savedAmount > 0;
  const eventBadgeLabel = pricing.isEventPriceActive
    ? "Event Offer"
    : pricing.eventStatus === "active"
      ? "Event Live"
      : pricing.eventStatus === "upcoming"
        ? "Upcoming Event"
        : "";
  const shopId = product.shop?.id || product.shopId;
  const shopHref = shopId ? `/shops/${shopId}` : "#";
  const productHref = `/product/${product.slug}`;

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

    addToWishlist(
      product,
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

  const handleCartClick = () => {
    if (requiresOptionSelection) {
      setIsPreviewOpen(true);
      return;
    }

    addToCart(
      product,
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
        action: "add_to_cart",
      }),
    );
  };

  const handleQuickPreviewClick = () => {
    setIsPreviewOpen(true);
  };

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-stone-200/70">
        <div className="relative aspect-square overflow-hidden bg-stone-50">
          <img
            src={thumbnail}
            alt={product.title}
            className="h-full w-full bg-stone-100 object-cover transition duration-500 group-hover:scale-105"
          />

          {eventBadgeLabel ? (
            <div className="absolute left-2 top-2 inline-flex max-w-[calc(100%-3.25rem)] items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-gray-900 shadow-sm">
              <Timer className="h-3 w-3 text-amber-600" />
              <span>{eventBadgeLabel}</span>
              {eventInfo.remainingText ? (
                <span className="text-gray-500">{eventInfo.remainingText}</span>
              ) : null}
            </div>
          ) : null}

          <div className="absolute right-2 top-2 flex w-8 flex-col gap-1.5">
            <button
              type="button"
              onClick={handleWishlistClick}
              aria-label={
                isInWishlist ? "Remove from wishlist" : "Add to wishlist"
              }
              className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
                isInWishlist
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-stone-200 bg-white text-gray-700 hover:text-amber-700"
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${isInWishlist ? "fill-amber-500" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={handleQuickPreviewClick}
              aria-label={`Quick preview for ${product.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 shadow-sm transition hover:text-amber-700"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleCartClick}
              aria-label={isInCart ? "Add another to cart" : "Add to cart"}
              className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
                isInCart
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-stone-200 bg-white text-gray-700 hover:text-amber-700"
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3">
          <Link
            href={shopHref}
            className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-amber-700"
          >
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {product.shop?.name || "Zuzi seller"}
            </span>
          </Link>

          <Link href={productHref} className="mt-1.5 block">
            <h3 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 text-gray-900 transition group-hover:text-amber-800">
              {product.title}
            </h3>
          </Link>

          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{product.ratings?.toFixed(1) || "0.0"}</span>
            </div>
            <span className="shrink-0">{product.totalSales || 0} sold</span>
          </div>

          <div className="mt-auto flex flex-wrap items-baseline gap-1.5 pt-2.5">
            {pricing.displayPrice ? (
              <span className="text-base font-bold leading-none text-gray-900">
                {formatPrice(pricing.displayPrice)}
              </span>
            ) : null}
            {hasSavings ? (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(pricing.compareAtPrice)}
              </span>
            ) : null}
          </div>

          {pricing.eventStatus === "upcoming" && pricing.eventSalePrice ? (
            <p className="mt-1.5 text-[11px] font-medium text-amber-700">
              Event price starts soon
            </p>
          ) : null}

          {hasSavings ? (
            <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
              <BadgePercent className="h-3 w-3" />
              Save {formatPrice(savedAmount)}
            </div>
          ) : null}
        </div>
      </article>

      <ProductQuickPreviewModal
        product={product}
        user={user}
        location={location}
        deviceInfo={deviceInfo}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
}
