"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Clock3,
  ClipboardList,
  Eye,
  Loader2,
  PackagePlus,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useProduct } from "@/hooks/useProduct";
import { useSellerOrders } from "@/hooks/useOrder";
import { useSellerSession } from "@/hooks/useAuth";
import { useSellerShopAnalytics } from "@/hooks/useShopAnalytics";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? price : 0);

const formatDateTime = (dateValue?: string | null) => {
  if (!dateValue) return "No visits yet";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "No visits yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatShortDate = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export default function SellerDashboardPage() {
  const { seller, shop, isLoading: isSellerLoading } = useSellerSession();
  const { getShopProducts } = useProduct();
  const productsQuery = getShopProducts({ page: 1, limit: 5 });
  const ordersQuery = useSellerOrders({ page: 1, limit: 5 });
  const shopAnalyticsQuery = useSellerShopAnalytics();
  const products = productsQuery.data?.products || [];
  const orders = ordersQuery.data?.orders || [];
  const shopAnalytics = shopAnalyticsQuery.data?.analytics;
  const productsTotal =
    productsQuery.data?.pagination?.totalItems ??
    productsQuery.data?.pagination?.totalCount ??
    products.length;
  const ordersTotal =
    ordersQuery.data?.pagination?.totalItems ??
    ordersQuery.data?.pagination?.total ??
    orders.length;
  const openOrdersOnPage = orders.filter(
    (order) => !["Delivered", "Cancelled", "Refunded"].includes(order.status),
  ).length;
  const recentOrderTotal = orders.reduce((total, order) => total + order.total, 0);
  const displayName = shop?.name || seller?.name || "your shop";
  const dailyVisits = shopAnalytics?.daily || [];
  const maxDailyVisits = Math.max(
    1,
    ...dailyVisits.map((day) => day.totalVisits),
  );
  const hasShopVisits = Boolean(shopAnalytics && shopAnalytics.totalVisits > 0);

  const cards = [
    {
      label: "Products",
      value: productsQuery.isLoading ? "..." : productsTotal,
      detail: "Live listings in your shop",
      icon: Boxes,
    },
    {
      label: "Orders",
      value: ordersQuery.isLoading ? "..." : ordersTotal,
      detail: "Customer orders received",
      icon: ClipboardList,
    },
    {
      label: "Open on page",
      value: ordersQuery.isLoading ? "..." : openOrdersOnPage,
      detail: "Recent orders needing attention",
      icon: ShoppingBag,
    },
    {
      label: "Recent total",
      value: ordersQuery.isLoading ? "..." : formatPrice(recentOrderTotal),
      detail: "Total from the latest loaded orders",
      icon: TrendingUp,
    },
  ];
  const shopVisitCards = [
    {
      label: "Total visits",
      value: shopAnalyticsQuery.isLoading
        ? "..."
        : shopAnalytics?.totalVisits || 0,
      detail: "All storefront visits",
      icon: Eye,
    },
    {
      label: "Logged-in",
      value: shopAnalyticsQuery.isLoading
        ? "..."
        : shopAnalytics?.loggedInVisits || 0,
      detail: "Visits from signed-in customers",
      icon: UserCheck,
    },
    {
      label: "Guest visits",
      value: shopAnalyticsQuery.isLoading
        ? "..."
        : shopAnalytics?.guestVisits || 0,
      detail: "Visits without customer session",
      icon: Users,
    },
    {
      label: "Last visited",
      value: shopAnalyticsQuery.isLoading
        ? "..."
        : formatDateTime(shopAnalytics?.lastVisitedAt),
      detail: "Most recent shop page visit",
      icon: Clock3,
    },
  ];

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-900 sm:p-6">
      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Seller dashboard
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold text-slate-950 sm:text-3xl">
              Welcome back{isSellerLoading ? "" : `, ${displayName}`}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Track your latest products and orders from one focused workspace.
            </p>
          </div>
          <Link
            href="/dashboard/create-product"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
          >
            <PackagePlus className="h-4 w-4" />
            Create product
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">
                {card.label}
              </p>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-950">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Shop visits
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Storefront analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Visits captured from your public shop detail page.
            </p>
          </div>
          {shopAnalyticsQuery.isFetching && !shopAnalyticsQuery.isLoading ? (
            <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Updating
            </span>
          ) : null}
        </div>

        {shopAnalyticsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading shop analytics...
          </div>
        ) : shopAnalyticsQuery.isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Unable to load shop visit analytics right now.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {shopVisitCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">
                      {card.label}
                    </p>
                    <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <card.icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-4 break-words text-2xl font-bold text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">
                    Last 14 days
                  </h3>
                  <p className="text-sm text-slate-500">
                    Daily total storefront visits.
                  </p>
                </div>
                {!hasShopVisits ? (
                  <span className="mt-2 w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 sm:mt-0">
                    No shop visits recorded yet.
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto pb-1">
                {dailyVisits.map((day) => {
                  const height = Math.max(
                    6,
                    (day.totalVisits / maxDailyVisits) * 100,
                  );

                  return (
                    <div
                      key={day.date}
                      className="flex min-w-10 flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex h-28 w-full items-end rounded-full bg-white px-1.5 py-1">
                        <div
                          className="w-full rounded-full bg-emerald-500"
                          style={{ height: `${height}%` }}
                          aria-label={`${day.totalVisits} visits on ${day.date}`}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        {day.totalVisits}
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-slate-500">
                        {formatShortDate(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Recent products</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest listings from your shop.
              </p>
            </div>
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-600"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {productsQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          ) : products.length ? (
            <div className="space-y-3">
              {products.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {product.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.status} - Stock {product.stock}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald-700">
                    {formatPrice(product.sale_price)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No products yet.</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Recent orders</h2>
              <p className="mt-1 text-sm text-slate-500">
                New paid orders for fulfillment.
              </p>
            </div>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-600"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {ordersQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          ) : orders.length ? (
            <div className="space-y-3">
              {orders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {order.orderNumber || order.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.status} - {order.itemCount} items
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald-700">
                    {formatPrice(order.total)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No orders yet.</p>
          )}
        </article>
      </section>
    </div>
  );
}
