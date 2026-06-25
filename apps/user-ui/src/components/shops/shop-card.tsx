"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Package, Star, Store } from "lucide-react";
import { Shop } from "@/types/shop";
import { getShopAvatarUrl, getShopCoverUrl } from "@/utils/image-assets";

interface ShopCardProps {
  shop: Shop;
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

const formatJoinedDate = (createdAt?: string) => {
  if (!createdAt) return undefined;

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
};

export function ShopCard({ shop }: ShopCardProps) {
  const bannerUrl = getShopCoverUrl(shop);
  const avatarUrl = getShopAvatarUrl(shop);
  const joinedDate = formatJoinedDate(shop.createdAt);
  const shopHref = `/shops/${shop.id}`;
  const rating =
    typeof shop.ratings === "number" && Number.isFinite(shop.ratings)
      ? shop.ratings
      : undefined;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-stone-200/70">
      <div className="relative h-36 overflow-visible bg-stone-100">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`${shop.name} cover`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 via-amber-50 to-stone-200 text-stone-400">
            <Store className="h-10 w-10" />
          </div>
        )}

        <div className="absolute left-1/2 bottom-0 flex h-20 w-20 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white shadow-md">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${shop.name} avatar`}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-amber-50 text-lg font-extrabold text-amber-700">
              {getShopInitials(shop.name)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-12 text-center">
        <Link href={shopHref} className="block min-w-0">
          <h2 className="truncate text-lg font-extrabold text-gray-900 transition group-hover:text-amber-800">
            {shop.name}
          </h2>
        </Link>

        <p className="mt-1 text-sm font-medium text-amber-700">
          {shop.category || "Marketplace seller"}
        </p>

        <p className="mt-3 line-clamp-2 min-h-10 break-words text-sm leading-5 text-gray-600">
          {shop.bio || "Explore products and offers from this Zuzi seller."}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
          {rating !== undefined ? (
            <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          ) : null}

          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5 text-amber-600" />
            {shop.productCount ?? 0} products
          </span>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          {shop.address ? (
            <p className="inline-flex max-w-full items-center justify-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span className="truncate">{shop.address}</span>
            </p>
          ) : null}

          {joinedDate ? (
            <p className="inline-flex max-w-full items-center justify-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>Joined {joinedDate}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto pt-5">
          <Link
            href={shopHref}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            Visit shop
          </Link>
        </div>
      </div>
    </article>
  );
}
