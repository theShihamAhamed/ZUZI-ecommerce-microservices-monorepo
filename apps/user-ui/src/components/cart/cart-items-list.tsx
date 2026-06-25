"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, Store, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cart.store";
import { CartItem } from "@/types/product";
import { formatPrice, getSavedAmount } from "@/utils/price";
import { sendKafkaEvent } from "@/actions/send-kafka-event";
import { buildProductAnalyticsEvent } from "@/services/analytics-event.service";
import { getSelectedOptionsKey } from "@/utils/product-options";
import { getProductThumbnail } from "@/utils/image-assets";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

interface CartItemsListProps {
  items: CartItem[];
}

export function CartItemsList({ items }: CartItemsListProps) {
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const [removingItemKey, setRemovingItemKey] = useState<string | null>(null);

  const handleRemoveFromCart = async (item: CartItem) => {
    const itemKey = `${item.id}:${getSelectedOptionsKey(item.selectedOptions)}`;
    setRemovingItemKey(itemKey);

    try {
      await removeFromCart(item.id, item.selectedOptions, item.userId);
      void sendKafkaEvent(
        buildProductAnalyticsEvent({
          product: item,
          userId: item.userId || null,
          location: item.location,
          deviceInfo: item.deviceInfo,
          action: "remove_from_cart",
        }),
      );
    } catch {
      // The cart store restores the backend state on failure.
    } finally {
      setRemovingItemKey((current) => (current === itemKey ? null : current));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="hidden border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 xl:grid xl:grid-cols-[76px_minmax(0,1fr)_90px_118px_96px_92px] xl:items-center xl:gap-2">
        <span>Product</span>
        <span>Details</span>
        <span>Price</span>
        <span>Quantity</span>
        <span>Line total</span>
        <span className="text-right">Remove</span>
      </div>

      <div className="divide-y divide-stone-200">
        {items.map((item) => {
          const itemKey = `${item.id}:${getSelectedOptionsKey(
            item.selectedOptions,
          )}`;
          const isRemoving = removingItemKey === itemKey;
          const quantity = item.quantity || 1;
          const thumbnail = getProductThumbnail(item) || PRODUCT_PLACEHOLDER_IMAGE;
          const savedAmount = getSavedAmount(
            item.regular_price,
            item.sale_price,
          );
          const shopId = item.shop?.id || item.shopId;
          const productHref = item.slug ? `/product/${item.slug}` : "#";
          const shopHref = shopId ? `/shops/${shopId}` : "#";
          const lineTotal = item.sale_price * quantity;
          const selectedOptionEntries = Object.entries(
            item.selectedOptions || {},
          );

          return (
            <article
              key={itemKey}
              className="grid gap-4 p-4 sm:grid-cols-[76px_1fr] xl:grid-cols-[76px_minmax(0,1fr)_90px_118px_96px_92px] xl:items-center xl:gap-2"
            >
              <Link
                href={productHref}
                className="block h-[76px] w-[76px] overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
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
                {selectedOptionEntries.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedOptionEntries.map(([name, value]) => (
                      <span
                        key={`${name}-${value}`}
                        className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
                      >
                        {name}: {value}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(item.sale_price)}
                  </span>
                  {savedAmount > 0 ? (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(item.regular_price)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex w-fit items-center rounded-full border border-stone-200 bg-stone-50">
                <button
                  type="button"
                  onClick={() =>
                    decreaseQuantity(item.id, item.selectedOptions, item.userId)
                  }
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
                  onClick={() =>
                    increaseQuantity(item.id, item.selectedOptions, item.userId)
                  }
                  aria-label={`Increase quantity for ${item.title}`}
                  className="flex h-9 w-9 items-center justify-center text-gray-700 transition hover:text-amber-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm font-bold text-gray-900">
                {formatPrice(lineTotal)}
              </p>

              <div className="flex xl:justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveFromCart(item)}
                  disabled={isRemoving}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 xl:px-2.5"
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isRemoving ? "Removing" : "Remove"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
