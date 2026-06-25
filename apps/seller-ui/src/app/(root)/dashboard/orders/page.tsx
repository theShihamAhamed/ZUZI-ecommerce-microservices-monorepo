"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSellerOrders } from "@/hooks/useOrder";
import {
  getOrderStatusLabel,
  getStatusStyle,
} from "@/lib/order-status";

const ORDER_LIMIT = 10;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "Ordered", label: "Ordered" },
  { value: "Packed", label: "Packed" },
  { value: "Shipped", label: "Shipped" },
  { value: "OutForDelivery", label: "Out for Delivery" },
  { value: "Delivered", label: "Delivered" },
  { value: "Paid", label: "Paid" },
  { value: "Processing", label: "Processing" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Refunded", label: "Refunded" },
];

const paymentStatusOptions = [
  { value: "all", label: "All payments" },
  { value: "Pending", label: "Pending" },
  { value: "Succeeded", label: "Succeeded" },
  { value: "Failed", label: "Failed" },
  { value: "Refunded", label: "Refunded" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "total-high", label: "Total high to low" },
  { value: "total-low", label: "Total low to high" },
];

const filterControlClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? price : 0);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDatePresetRange = (preset: string) => {
  const today = new Date();
  const start = new Date(today);

  switch (preset) {
    case "today":
      return {
        from: toDateInputValue(today),
        to: toDateInputValue(today),
      };
    case "last-7":
      start.setDate(today.getDate() - 6);
      return {
        from: toDateInputValue(start),
        to: toDateInputValue(today),
      };
    case "last-30":
      start.setDate(today.getDate() - 29);
      return {
        from: toDateInputValue(start),
        to: toDateInputValue(today),
      };
    case "this-month":
      start.setDate(1);
      return {
        from: toDateInputValue(start),
        to: toDateInputValue(today),
      };
    default:
      return { from: "", to: "" };
  }
};

const datePresetOptions = [
  { value: "today", label: "Today" },
  { value: "last-7", label: "Last 7 days" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
];

export default function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [sort, setSort] = useState("newest");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const queryParams = useMemo(
    () => ({
      page,
      limit: ORDER_LIMIT,
      q: debouncedSearchTerm,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      sort,
    }),
    [
      dateFrom,
      dateTo,
      debouncedSearchTerm,
      page,
      paymentStatus,
      sort,
      status,
    ],
  );
  const ordersQuery = useSellerOrders(queryParams);
  const orders = ordersQuery.data?.orders || [];
  const pagination = ordersQuery.data?.pagination;
  const totalOrders =
    pagination?.totalItems ?? pagination?.total ?? orders.length;
  const totalPages = pagination?.totalPages || 1;
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    status !== "all" ||
    paymentStatus !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sort !== "newest";
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;

  const resetPageAndSet = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchTerm("");
    setStatus("all");
    setPaymentStatus("all");
    setDateFrom("");
    setDateTo("");
    setDatePreset("");
    setSort("newest");
  };

  const applyDatePreset = (preset: string) => {
    const range = getDatePresetRange(preset);

    setPage(1);
    setDatePreset(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const clearDateRange = () => {
    setPage(1);
    setDatePreset("");
    setDateFrom("");
    setDateTo("");
  };

  const activeDateRangeText =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
      : dateFrom
        ? `From ${formatDate(dateFrom)}`
        : dateTo
          ? `Until ${formatDate(dateTo)}`
          : "No date range selected";

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold text-slate-950">
            Orders
          </h1>
          <p className="mt-1 max-w-3xl break-words text-sm text-slate-500">
            View and manage paid orders for your shop.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ordersQuery.isFetching && !ordersQuery.isLoading ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          ) : null}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <XCircle className="h-4 w-4" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">
              Seller orders
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {pagination
                ? `${totalOrders} orders found`
                : "Loading order list"}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
            Search and filters
          </div>
          <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              {datePresetOptions.map((option) => {
                const isActive = datePreset === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyDatePreset(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={clearDateRange}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Clear dates
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Active range:{" "}
              <span className="font-semibold text-slate-700">
                {activeDateRangeText}
              </span>
            </p>
          </div>
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(220px,1.35fr)_repeat(6,minmax(130px,1fr))]">
            <label className="relative min-w-0">
              <span className="sr-only">Search orders</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setPage(1);
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search order, ID, product..."
                className={`${filterControlClass} w-full pl-9`}
              />
            </label>

            <label className="min-w-0">
              <span className="sr-only">Order status</span>
              <select
                value={status}
                onChange={(event) =>
                  resetPageAndSet(setStatus, event.target.value)
                }
                className={`${filterControlClass} w-full`}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="sr-only">Payment status</span>
              <select
                value={paymentStatus}
                onChange={(event) =>
                  resetPageAndSet(setPaymentStatus, event.target.value)
                }
                className={`${filterControlClass} w-full`}
              >
                {paymentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="sr-only">Date from</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDatePreset("custom");
                  resetPageAndSet(setDateFrom, event.target.value);
                }}
                className={`${filterControlClass} w-full`}
              />
            </label>

            <label className="min-w-0">
              <span className="sr-only">Date to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDatePreset("custom");
                  resetPageAndSet(setDateTo, event.target.value);
                }}
                className={`${filterControlClass} w-full`}
              />
            </label>

            <label className="min-w-0 xl:col-span-2">
              <span className="sr-only">Sort orders</span>
              <select
                value={sort}
                onChange={(event) => resetPageAndSet(setSort, event.target.value)}
                className={`${filterControlClass} w-full`}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl bg-slate-200"
              />
            ))}
          </div>
        ) : null}

        {ordersQuery.isError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="mt-3 font-semibold text-slate-950">
              Failed to load orders
            </h2>
            <button
              type="button"
              onClick={() => ordersQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {!ordersQuery.isLoading &&
        !ordersQuery.isError &&
        orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              {hasActiveFilters
                ? "No orders match your filters"
                : "No orders yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {hasActiveFilters
                ? "Try a different search, status, date range, or sort."
                : "New paid orders for your shop will appear here."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <XCircle className="h-4 w-4" />
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {!ordersQuery.isLoading &&
        !ordersQuery.isError &&
        orders.length > 0 ? (
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="max-w-full overflow-x-auto">
              <div className="lg:min-w-[980px]">
                <div className="hidden grid-cols-[1.15fr_0.85fr_1fr_0.6fr_0.75fr_0.85fr_0.6fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
                  <span>Order</span>
                  <span>Date</span>
                  <span>Ship to</span>
                  <span>Items</span>
                  <span>Total</span>
                  <span>Status</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <article
                      key={order.id}
                      className="grid min-w-0 gap-4 px-4 py-4 lg:grid-cols-[1.15fr_0.85fr_1fr_0.6fr_0.75fr_0.85fr_0.6fr] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">
                          {order.orderNumber || order.id}
                        </p>
                        {order.orderGroupId ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Multi-shop checkout
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatDate(order.createdAt)}
                      </p>
                      <div className="min-w-0 text-sm text-slate-600">
                        <p className="truncate">
                          {order.shippingSummary?.fullName || "Not available"}
                        </p>
                        {order.shippingSummary?.line ? (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {order.shippingSummary.line}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">{order.itemCount}</p>
                      <p className="font-semibold text-slate-950">
                        {formatPrice(order.total)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                            order.status,
                          )}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                            order.paymentStatus,
                          )}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                      <div className="lg:text-right">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                        >
                          View
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!hasPreviousPage || ordersQuery.isFetching}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-center text-sm text-slate-500">
              Page {pagination.currentPage ?? pagination.page} of{" "}
              {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(pagination.totalPages, current + 1))
              }
              disabled={!hasNextPage || ordersQuery.isFetching}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
