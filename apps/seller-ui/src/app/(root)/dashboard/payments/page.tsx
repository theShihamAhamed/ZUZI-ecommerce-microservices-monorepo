"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useSellerPayments,
  useSellerPaymentsSummary,
} from "@/hooks/usePayment";
import { SellerCommissionStatus } from "@/types/payment";

const PAYMENTS_LIMIT = 10;

const statusOptions = [
  { value: "all", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Earned", label: "Earned" },
  { value: "Reversed", label: "Reversed" },
  { value: "Refunded", label: "Refunded" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "gross-high", label: "Gross high to low" },
  { value: "gross-low", label: "Gross low to high" },
  { value: "commission-high", label: "Commission high to low" },
  { value: "receivable-high", label: "Receivable high to low" },
];

const datePresetOptions = [
  { value: "today", label: "Today" },
  { value: "last-7", label: "Last 7 days" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-month", label: "This month" },
];

const filterControlClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const formatMoney = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatDate = (date?: string | null) => {
  if (!date) return "Not recognized yet";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

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

const getStatusStyle = (status: SellerCommissionStatus) => {
  switch (status) {
    case "Earned":
      return "bg-emerald-50 text-emerald-700";
    case "Pending":
      return "bg-amber-50 text-amber-700";
    case "Refunded":
      return "bg-red-50 text-red-700";
    case "Reversed":
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default function SellerPaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [sort, setSort] = useState("newest");
  const queryParams = useMemo(
    () => ({
      page,
      limit: PAYMENTS_LIMIT,
      status,
      sort,
      dateFrom,
      dateTo,
    }),
    [dateFrom, dateTo, page, sort, status],
  );
  const summaryQuery = useSellerPaymentsSummary();
  const paymentsQuery = useSellerPayments(queryParams);
  const payments = paymentsQuery.data?.payments || [];
  const pagination = paymentsQuery.data?.pagination;
  const totalPayments =
    pagination?.totalItems ?? pagination?.total ?? payments.length;
  const totalPages = pagination?.totalPages || 1;
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;
  const hasActiveFilters =
    status !== "all" || Boolean(dateFrom) || Boolean(dateTo) || sort !== "newest";
  const summary = summaryQuery.data?.summary;

  const resetPageAndSet = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
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

  const clearFilters = () => {
    setPage(1);
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setDatePreset("");
    setSort("newest");
  };

  const activeDateRangeText =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
      : dateFrom
        ? `From ${formatDate(dateFrom)}`
        : dateTo
          ? `Until ${formatDate(dateTo)}`
          : "No date range selected";

  const summaryCards = [
    {
      label: "Gross Sales",
      value: formatMoney(summary?.grossSales || 0),
      detail: `${summary?.totalRecords || 0} payment records`,
      icon: CreditCard,
    },
    {
      label: "Platform Commission",
      value: formatMoney(summary?.totalCommission || 0),
      detail: "Total marketplace commission",
      icon: Banknote,
    },
    {
      label: "Seller Receivable",
      value: formatMoney(summary?.sellerReceivable || 0),
      detail: "Estimated amount after commission",
      icon: WalletCards,
    },
    {
      label: "Pending",
      value: formatMoney(summary?.pendingReceivable || 0),
      detail: `${formatMoney(summary?.pendingCommission || 0)} commission`,
      icon: Clock3,
    },
    {
      label: "Earned",
      value: formatMoney(summary?.earnedReceivable || 0),
      detail: `${formatMoney(summary?.earnedCommission || 0)} commission`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Dashboard / Payments
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-slate-950">
            Payments
          </h1>
          <p className="mt-1 max-w-3xl break-words text-sm text-slate-500">
            Review read-only commission and receivable records from customer
            orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {paymentsQuery.isFetching && !paymentsQuery.isLoading ? (
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
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
              {summaryQuery.isLoading ? "..." : card.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">
              Payment records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {pagination
                ? `${totalPayments} records found`
                : "Loading payment records"}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
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

          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="min-w-0">
              <span className="sr-only">Commission status</span>
              <select
                value={status}
                onChange={(event) =>
                  resetPageAndSet(setStatus, event.target.value)
                }
                className={`${filterControlClass} w-full`}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Status: {option.label}
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

            <label className="min-w-0">
              <span className="sr-only">Sort payments</span>
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

        {paymentsQuery.isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-slate-200"
              />
            ))}
          </div>
        ) : null}

        {paymentsQuery.isError || summaryQuery.isError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="mt-3 font-semibold text-slate-950">
              Failed to load payments
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              We could not fetch your seller payment records. Please try again.
            </p>
            <button
              type="button"
              onClick={() => {
                summaryQuery.refetch();
                paymentsQuery.refetch();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {!paymentsQuery.isLoading &&
        !paymentsQuery.isError &&
        payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              {hasActiveFilters
                ? "No payments match your filters"
                : "Payments will appear after customer orders are created."}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {hasActiveFilters
                ? "Try a different status, date range, or sort."
                : "Commission and receivable records are created from completed checkout orders."}
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

        {!paymentsQuery.isLoading &&
        !paymentsQuery.isError &&
        payments.length > 0 ? (
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="max-w-full overflow-x-auto">
              <div className="lg:min-w-[900px]">
                <div className="hidden grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
                  <span>Order</span>
                  <span>Gross</span>
                  <span>Commission</span>
                  <span>Receivable</span>
                  <span>Status</span>
                  <span>Date</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <article
                      key={payment.id}
                      className="grid min-w-0 gap-4 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_0.8fr] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">
                          {payment.orderNumber || payment.orderId}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {payment.orderGroupId
                            ? "Multi-shop checkout"
                            : payment.paymentReference
                              ? `Payment ${payment.paymentReference}`
                              : "Single order"}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-950">
                        {formatMoney(payment.commissionBase, payment.currency)}
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatMoney(payment.commissionAmount, payment.currency)}
                      </p>
                      <p className="text-sm font-bold text-emerald-700">
                        {formatMoney(
                          payment.sellerReceivableAmount,
                          payment.currency,
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                            payment.status,
                          )}`}
                        >
                          {payment.status}
                        </span>
                        {payment.orderStatus ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {payment.orderStatus}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{formatDate(payment.createdAt)}</p>
                        {payment.recognizedAt ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            Earned {formatDate(payment.recognizedAt)}
                          </p>
                        ) : null}
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
              disabled={!hasPreviousPage || paymentsQuery.isFetching}
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
              disabled={!hasNextPage || paymentsQuery.isFetching}
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
