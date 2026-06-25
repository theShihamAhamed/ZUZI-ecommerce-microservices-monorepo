"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Package,
  RefreshCw,
  Store,
  Tag,
} from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { ProductsGridSkeleton } from "@/components/products/products-grid-skeleton";
import { ProductsPagination } from "@/components/products/products-pagination";
import { ProductRatingStars } from "@/components/products/product-rating-stars";
import { ShopReviewsSection } from "@/components/shops/shop-reviews-section";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useShopEvents, useShopProducts } from "@/hooks/useShops";
import { EventProductStatus } from "@/types/product";
import { Shop } from "@/types/shop";
import { getShopAvatarUrl, getShopCoverUrl } from "@/utils/image-assets";

type ShopTab = "products" | "offers" | "reviews" | "about";
type ShopOfferStatus = Exclude<EventProductStatus, "expired">;

interface ShopDetailViewProps {
  shop: Shop;
}

const PRODUCT_LIMIT = 12;
const shopOfferStatuses: Array<{ value: ShopOfferStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ended", label: "Ended" },
];

const tabs: Array<{ id: ShopTab; label: string }> = [
  { id: "products", label: "Products" },
  { id: "offers", label: "Offers" },
  { id: "reviews", label: "Reviews" },
  { id: "about", label: "About" },
];

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
    month: "long",
    year: "numeric",
  }).format(date);
};

const getSafeWebsiteUrl = (website?: string | null) => {
  const trimmed = website?.trim();

  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

function ShopProductsPanel({
  shopId,
  isOffers = false,
}: {
  shopId: string;
  isOffers?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [offerStatus, setOfferStatus] = useState<ShopOfferStatus>("all");
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();
  const productsQuery = useShopProducts(shopId, {
    page,
    limit: PRODUCT_LIMIT,
    sort: "popular",
  }, !isOffers);
  const offersQuery = useShopEvents(shopId, {
    page,
    limit: PRODUCT_LIMIT,
    status: offerStatus,
  }, isOffers);
  const query = isOffers ? offersQuery : productsQuery;
  const products = query.data?.products || [];
  const emptyOfferText =
    offerStatus === "active"
      ? "No active offers right now."
      : offerStatus === "upcoming"
        ? "No upcoming offers right now."
        : offerStatus === "ended"
          ? "No ended offers for this shop."
          : "No current or upcoming offers right now.";
  const handleOfferStatusChange = (status: ShopOfferStatus) => {
    setOfferStatus(status);
    setPage(1);
  };

  const offerStatusFilter = isOffers ? (
    <div className="mb-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
      <div className="flex min-w-max gap-2">
        {shopOfferStatuses.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => handleOfferStatusChange(status.value)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              offerStatus === status.value
                ? "bg-black text-white"
                : "text-gray-700 hover:bg-amber-50 hover:text-amber-800"
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  if (query.isLoading) {
    return (
      <>
        {offerStatusFilter}
        <ProductsGridSkeleton count={8} />
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        {offerStatusFilter}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
            <RefreshCw className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-bold text-gray-900">
            {isOffers ? "Unable to load offers" : "Unable to load products"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">Please try again.</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {query.isFetching ? "Trying again..." : "Retry"}
          </button>
        </div>
      </>
    );
  }

  if (products.length === 0) {
    return (
      <>
        {offerStatusFilter}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            {isOffers ? (
              <Tag className="h-6 w-6" />
            ) : (
              <Package className="h-6 w-6" />
            )}
          </div>
          <h2 className="mt-4 text-base font-bold text-gray-900">
            {isOffers
              ? emptyOfferText
              : "No products available from this shop yet."}
          </h2>
        </div>
      </>
    );
  }

  return (
    <>
      {offerStatusFilter}

      <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            user={fetchUser.data}
            location={location}
            deviceInfo={deviceInfo}
          />
        ))}
      </div>

      <ProductsPagination
        pagination={query.data?.pagination}
        onPageChange={setPage}
      />
    </>
  );
}

export function ShopDetailView({ shop }: ShopDetailViewProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>("products");
  const bannerUrl = getShopCoverUrl(shop);
  const avatarUrl = getShopAvatarUrl(shop);
  const joinedDate = formatJoinedDate(shop.createdAt);
  const websiteUrl = getSafeWebsiteUrl(shop.website);
  const reviewCount = shop.reviewCount ?? 0;
  const details = useMemo(
    () =>
      [
        shop.category
          ? {
              icon: Store,
              label: shop.category,
            }
          : undefined,
        shop.address
          ? {
              icon: MapPin,
              label: shop.address,
            }
          : undefined,
        joinedDate
          ? {
              icon: CalendarDays,
              label: `Joined ${joinedDate}`,
            }
          : undefined,
      ].filter(Boolean) as Array<{
        icon: typeof Store;
        label: string;
      }>,
    [joinedDate, shop.address, shop.category],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="relative h-48 bg-stone-100 sm:h-64 lg:h-72">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={`${shop.name} cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 via-amber-50 to-stone-200 text-stone-400">
              <Store className="h-14 w-14" />
            </div>
          )}

          <div className="absolute left-1/2 bottom-0 flex h-28 w-28 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg sm:h-32 sm:w-32">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${shop.name} avatar`}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-amber-50 text-2xl font-extrabold text-amber-700">
                {getShopInitials(shop.name)}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-6 pt-16 text-center sm:px-8 sm:pt-20">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              {shop.category || "Marketplace shop"}
            </p>
            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-normal text-gray-900 sm:text-4xl">
              {shop.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              {reviewCount > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <ProductRatingStars
                    rating={shop.ratings}
                    sizeClassName="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-600">
                    {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-gray-700">
                  No reviews yet
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-gray-700">
                <Package className="h-4 w-4 text-amber-600" />
                {shop.productCount ?? 0} products
              </span>
            </div>

            {shop.bio ? (
              <p className="mx-auto mt-5 max-w-2xl break-words text-sm leading-6 text-gray-600 sm:text-base">
                {shop.bio}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
              {details.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5"
                >
                  <Icon className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="truncate">{label}</span>
                </span>
              ))}

              {websiteUrl ? (
                <Link
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 font-medium transition hover:border-amber-300 hover:text-amber-700"
                >
                  <Globe className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="truncate">Website</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 min-w-0">
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {activeTab === "products" ? (
            <ShopProductsPanel shopId={shop.id} />
          ) : null}

          {activeTab === "offers" ? (
            <ShopProductsPanel shopId={shop.id} isOffers />
          ) : null}

          {activeTab === "reviews" ? (
            <ShopReviewsSection shopId={shop.id} />
          ) : null}

          {activeTab === "about" ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-extrabold text-gray-900">
                    About this shop
                  </h2>
                </div>
                <p className="mt-4 break-words text-sm leading-6 text-gray-600">
                  {shop.bio ||
                    "This seller has not added a shop description yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-extrabold text-gray-900">
                  Shop details
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="font-semibold text-gray-900">Category</dt>
                    <dd className="mt-1 break-words text-gray-600">
                      {shop.category || "Marketplace seller"}
                    </dd>
                  </div>
                  {shop.address ? (
                    <div>
                      <dt className="font-semibold text-gray-900">Address</dt>
                      <dd className="mt-1 break-words text-gray-600">
                        {shop.address}
                      </dd>
                    </div>
                  ) : null}
                  {shop.opening_hours ? (
                    <div>
                      <dt className="font-semibold text-gray-900">
                        Opening hours
                      </dt>
                      <dd className="mt-1 break-words text-gray-600">
                        {shop.opening_hours}
                      </dd>
                    </div>
                  ) : null}
                  {joinedDate ? (
                    <div>
                      <dt className="font-semibold text-gray-900">Joined</dt>
                      <dd className="mt-1 text-gray-600">{joinedDate}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
