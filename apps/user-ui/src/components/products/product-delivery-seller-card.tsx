"use client";

import Link from "next/link";
import {
  MapPin,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { Product } from "@/types/product";
import { getEstimatedDeliveryText } from "@/utils/delivery-date";
import {
  AnalyticsLocation,
  getAnalyticsLocationLabel,
} from "@/services/analytics-event.service";
import { ProductRatingStars } from "@/components/products/product-rating-stars";
import { ChatWithSellerButton } from "@/components/chat/chat-with-seller-button";
import { getShopAvatarUrl } from "@/utils/image-assets";

interface ProductDeliverySellerCardProps {
  product: Product;
  location: AnalyticsLocation;
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

export function ProductDeliverySellerCard({
  product,
  location,
}: ProductDeliverySellerCardProps) {
  const shopId = product.shop?.id || product.shopId;
  const shopHref = shopId ? `/shops/${shopId}` : "#";
  const locationLabel = getAnalyticsLocationLabel(location);
  const hasKnownLocation = locationLabel !== "Unknown location";
  const shopAvatarUrl = getShopAvatarUrl(product.shop);

  return (
    <aside className="min-w-0 max-w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Truck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">Delivery options</h2>
          <p className="mt-1 break-words text-sm text-gray-600">
            {hasKnownLocation
              ? `Deliver to ${locationLabel}`
              : "Location unavailable"}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-gray-900">
            {getEstimatedDeliveryText()}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-stone-200 pt-5">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <RotateCcw className="h-4 w-4 text-amber-600" />
          <span className="min-w-0 break-words">
            Return information available at checkout
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <span className="min-w-0 break-words">
            {product.warranty || "Warranty details unavailable"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <MapPin className="h-4 w-4 text-amber-600" />
          <span className="min-w-0 break-words">
            {product.cashOnDelivery
              ? `Cash on delivery: ${product.cashOnDelivery}`
              : "Cash on delivery depends on seller"}
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-stone-200 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Sold by
        </p>
        <div className="mt-3 flex items-center gap-3">
          {shopAvatarUrl ? (
            <img
              src={shopAvatarUrl}
              alt={product.shop?.name || "Shop avatar"}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-gray-900">
              {getShopInitials(product.shop?.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <Link
              href={shopHref}
              className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-amber-700"
            >
              <Store className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="truncate">
                {product.shop?.name || "Zuzi seller"}
              </span>
            </Link>
            <p className="mt-1 truncate text-xs text-gray-500">
              {product.shop?.address ||
                product.shop?.category ||
                "Marketplace seller"}
            </p>
          </div>
        </div>

        {typeof product.shop?.ratings === "number" ? (
          <div className="mt-4">
            <ProductRatingStars
              rating={product.shop.ratings}
              sizeClassName="h-3.5 w-3.5"
            />
          </div>
        ) : null}

        <div className="mt-4 break-words rounded-xl bg-stone-50 p-3 text-sm text-gray-600">
          Seller metrics coming soon
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <ChatWithSellerButton
            product={product}
            className={`inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              shopId
                ? "border-stone-200 bg-white text-gray-900 hover:bg-amber-50 hover:text-amber-700"
                : "border-stone-200 bg-stone-100 text-gray-400"
            }`}
          />
          <Link
            href={shopHref}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 ${
              shopId ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <Store className="h-4 w-4" />
            <span className="truncate">Go to Store</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
