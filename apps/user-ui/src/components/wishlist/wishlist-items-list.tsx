"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { Heart, Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { WishlistItem } from "@/types/product";
import { formatPrice, getSavedAmount } from "@/utils/price";
import { sendKafkaEvent } from "@/actions/send-kafka-event";
import { buildProductAnalyticsEvent } from "@/services/analytics-event.service";
import {
  getProductOptionGroups,
  hasRequiredProductOptions,
} from "@/utils/product-options";
import { getProductThumbnail } from "@/utils/image-assets";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

interface WishlistItemsListProps {
  items: WishlistItem[];
}

export function WishlistItemsList({ items }: WishlistItemsListProps) {
  const addToCartWithQuantity = useCartStore(
    (state) => state.addToCartWithQuantity,
  );
  const increaseWishlistQuantity = useWishlistStore(
    (state) => state.increaseWishlistQuantity,
  );
  const decreaseWishlistQuantity = useWishlistStore(
    (state) => state.decreaseWishlistQuantity,
  );
  const removeFromWishlist = useWishlistStore(
    (state) => state.removeFromWishlist,
  );

  const handleAddToCart = (item: WishlistItem) => {
    const optionGroups = getProductOptionGroups(item);

    if (hasRequiredProductOptions(optionGroups)) {
      toast.error("Choose product options from the product page first.");
      return;
    }

    addToCartWithQuantity(
      item,
      item.quantity || 1,
      item.userId,
      item.location || "Unknown location",
      item.deviceInfo || "Unknown device",
    );
    void sendKafkaEvent(
      buildProductAnalyticsEvent({
        product: item,
        userId: item.userId || null,
        location: item.location,
        deviceInfo: item.deviceInfo,
        action: "add_to_cart",
      }),
    );
  };

  const handleRemoveFromWishlist = (item: WishlistItem) => {
    removeFromWishlist(item.id);
    void sendKafkaEvent(
      buildProductAnalyticsEvent({
        product: item,
        userId: item.userId || null,
        location: item.location,
        deviceInfo: item.deviceInfo,
        action: "remove_from_wishlist",
      }),
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="hidden border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid lg:grid-cols-[96px_minmax(0,1.4fr)_150px_150px_260px] lg:items-center lg:gap-4">
        <span>Product</span>
        <span>Details</span>
        <span>Price</span>
        <span>Quantity</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y divide-stone-200">
        {items.map((item) => {
          const quantity = item.quantity || 1;
          const thumbnail = getProductThumbnail(item) || PRODUCT_PLACEHOLDER_IMAGE;
          const savedAmount = getSavedAmount(
            item.regular_price,
            item.sale_price,
          );
          const shopId = item.shop?.id || item.shopId;
          const productHref = item.slug ? `/product/${item.slug}` : "#";
          const shopHref = shopId ? `/shops/${shopId}` : "#";
          const isInStock = item.stock > 0;

          return (
            <article
              key={item.id}
              className="grid gap-4 p-4 sm:grid-cols-[96px_1fr] lg:grid-cols-[96px_minmax(0,1.4fr)_150px_150px_260px] lg:items-center"
            >
              <Link
                href={productHref}
                className="block h-24 w-24 overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
              >
                <img
                  src={thumbnail}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </Link>

              <div className="min-w-0">
                <Link
                  href={productHref}
                  className="line-clamp-2 break-words text-sm font-semibold text-gray-900 transition hover:text-amber-700"
                >
                  {item.title}
                </Link>
                <Link
                  href={shopHref}
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-amber-700"
                >
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {item.shop?.name || "Zuzi seller"}
                  </span>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isInStock
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {isInStock ? "In stock" : "Out of stock"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    <Heart className="h-3 w-3 text-amber-600" />
                    Wishlist
                  </span>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {formatPrice(item.sale_price)}
                  </span>
                  {savedAmount > 0 ? (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(item.regular_price)}
                    </span>
                  ) : null}
                </div>
                {savedAmount > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Save {formatPrice(savedAmount)}
                  </p>
                ) : null}
              </div>

              <div className="flex w-fit items-center rounded-full border border-stone-200 bg-stone-50">
                <button
                  type="button"
                  onClick={() => decreaseWishlistQuantity(item.id)}
                  aria-label={`Decrease quantity for ${item.title}`}
                  className="flex h-9 w-9 items-center justify-center text-gray-700 transition hover:text-amber-700"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-9 text-center text-sm font-semibold text-gray-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => increaseWishlistQuantity(item.id)}
                  aria-label={`Increase quantity for ${item.title}`}
                  className="flex h-9 w-9 items-center justify-center text-gray-700 transition hover:text-amber-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                <button
                  type="button"
                  onClick={() => handleAddToCart(item)}
                  disabled={!isInStock}
                  className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFromWishlist(item)}
                  className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
