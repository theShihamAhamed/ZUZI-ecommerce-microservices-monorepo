"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Edit3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useEvents } from "@/hooks/useEvents";
import {
  SellerEvent,
  SellerEventSort,
  SellerEventStatusFilter,
} from "@/types/event";
import { getProductThumbnail } from "@/utils/image-assets";
import toast from "react-hot-toast";

const EVENTS_LIMIT = 10;
const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

const eventTableGridClass =
  "2xl:grid-cols-[64px_minmax(190px,1.2fr)_minmax(100px,0.7fr)_128px_128px_92px_minmax(160px,0.9fr)_120px]";

const filterControlClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const statusOptions: Array<{ value: SellerEventStatusFilter; label: string }> = [
  { value: "all", label: "All events" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
];

const sortOptions: Array<{ value: SellerEventSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "start-date", label: "Start date" },
  { value: "ending-soon", label: "Ending soon" },
];

const formatDate = (date?: string | null) => {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

const formatPrice = (price?: number | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(price || 0));

const getEventStatus = (event: SellerEvent) => {
  if (event.isDeleted) return "Archived";

  const now = Date.now();
  const startsAt = event.starting_date
    ? new Date(event.starting_date).getTime()
    : null;
  const endsAt = event.ending_date
    ? new Date(event.ending_date).getTime()
    : null;

  if (startsAt && startsAt > now) return "Upcoming";
  if (endsAt && endsAt < now) return "Ended";
  return "Active";
};

const getEventStatusClass = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700";
    case "Upcoming":
      return "bg-amber-50 text-amber-700";
    case "Ended":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-red-50 text-red-700";
  }
};

const getEffectivePrice = (event: SellerEvent) =>
  typeof event.effective_price === "number"
    ? event.effective_price
    : event.sale_price;

const getPriceSourceLabel = (event: SellerEvent) => {
  if (event.active_price_source === "event") return "Event price active";
  if (event.event_status === "upcoming" && event.event_sale_price) {
    return "Event price scheduled";
  }
  if (event.event_status === "ended" && event.event_sale_price) {
    return "Event ended";
  }
  return "Normal sale price";
};

function EventsTableSkeleton() {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="max-w-full overflow-x-auto">
        <div className="2xl:min-w-[980px]">
          <div
            className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-3 2xl:grid ${eventTableGridClass} 2xl:gap-3`}
          >
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-3 animate-pulse rounded bg-slate-200"
              />
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className={`grid min-w-0 gap-4 p-4 2xl:grid ${eventTableGridClass} 2xl:items-center 2xl:gap-3`}
              >
                <div className="h-16 w-16 animate-pulse rounded-xl bg-slate-200" />
                {Array.from({ length: 7 }, (_, columnIndex) => (
                  <div
                    key={columnIndex}
                    className="h-4 min-w-0 animate-pulse rounded bg-slate-200"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerEventsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<SellerEventStatusFilter>("all");
  const [sort, setSort] = useState<SellerEventSort>("newest");
  const [eventPendingDelete, setEventPendingDelete] =
    useState<SellerEvent | null>(null);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const { getSellerEvents, deleteSellerEvent } = useEvents();
  const queryParams = useMemo(
    () => ({
      page,
      limit: EVENTS_LIMIT,
      q: debouncedSearchTerm,
      status: statusFilter,
      sort,
    }),
    [debouncedSearchTerm, page, sort, statusFilter],
  );
  const { data, isLoading, isError, isFetching, refetch } =
    getSellerEvents(queryParams);
  const events = data?.events || data?.products || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalEvents =
    pagination?.totalItems ?? pagination?.totalCount ?? events.length;
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "all" ||
    sort !== "newest";
  const stats = data?.stats || {
    total: totalEvents,
    active: events.filter((event) => getEventStatus(event) === "Active")
      .length,
    upcoming: events.filter((event) => getEventStatus(event) === "Upcoming")
      .length,
    ended: events.filter((event) => getEventStatus(event) === "Ended").length,
  };

  const resetPageAndSet = <T extends string>(
    setter: (value: T) => void,
    value: T,
  ) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchTerm("");
    setStatusFilter("all");
    setSort("newest");
  };

  const confirmDeleteEvent = async () => {
    if (!eventPendingDelete) return;

    try {
      await deleteSellerEvent.mutateAsync(eventPendingDelete.id);
      toast.success("Event removed. The product remains available.");
      setEventPendingDelete(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to remove event";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <header className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold text-slate-950">
            Events
          </h1>
          <p className="mt-2 max-w-3xl break-words text-sm text-slate-500">
            Manage event products, dates, stock, pricing, and visibility.
          </p>
        </div>
        <Link
          href="/dashboard/create-event"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Create event
        </Link>
      </header>

      <section className="grid min-w-0 gap-3 md:grid-cols-4">
        {[
          ["Total events", stats.total],
          ["Active", stats.active],
          ["Upcoming", stats.upcoming],
          ["Ended", stats.ended],
        ].map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setPage(1);
                setSearchTerm(event.target.value);
              }}
              placeholder="Search events..."
              className={`${filterControlClass} w-full pl-9`}
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              resetPageAndSet(
                setStatusFilter,
                event.target.value as SellerEventStatusFilter,
              )
            }
            className={filterControlClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) =>
              resetPageAndSet(setSort, event.target.value as SellerEventSort)
            }
            className={filterControlClass}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>
      </section>

      {isLoading ? (
        <EventsTableSkeleton />
      ) : isError ? (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950">
            Unable to load events
          </h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </section>
      ) : events.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <CalendarClock className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950">
            No events found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Create an event product or adjust your filters to find an existing
            event.
          </p>
        </section>
      ) : (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="max-w-full overflow-x-auto">
            <div className="2xl:min-w-[980px]">
              <div
                className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 2xl:grid ${eventTableGridClass} 2xl:gap-3`}
              >
                <span>Image</span>
                <span>Event</span>
                <span>Category</span>
                <span>Starts</span>
                <span>Ends</span>
                <span>Status</span>
                <span>Pricing</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {events.map((event) => {
                  const status = getEventStatus(event);
                  const image =
                    getProductThumbnail(event) || PRODUCT_PLACEHOLDER_IMAGE;
                  const hasEventPrice =
                    typeof event.event_sale_price === "number";

                  return (
                    <div
                      key={event.id}
                      className={`grid min-w-0 gap-4 p-4 2xl:grid ${eventTableGridClass} 2xl:items-center 2xl:gap-3`}
                    >
                      <img
                        src={image}
                        alt={event.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {event.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {event.slug}
                        </p>
                      </div>
                      <p className="truncate text-sm text-slate-600">
                        {event.category || "Uncategorized"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDate(event.starting_date)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDate(event.ending_date)}
                      </p>
                      <span
                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${getEventStatusClass(
                          status,
                        )}`}
                      >
                        {status}
                      </span>
                      <div className="min-w-0 text-sm text-slate-600">
                        <p className="font-semibold text-slate-950">
                          Effective {formatPrice(getEffectivePrice(event))}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Normal {formatPrice(event.sale_price)}
                        </p>
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            hasEventPrice
                              ? "text-emerald-700"
                              : "text-slate-400"
                          }`}
                        >
                          Event{" "}
                          {hasEventPrice
                            ? formatPrice(event.event_sale_price || 0)
                            : "not set"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {getPriceSourceLabel(event)}
                        </p>
                      </div>
                      <div className="flex items-center justify-start gap-2 2xl:justify-end">
                        <Link
                          href={`/product/${event.slug}`}
                          target="_blank"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                          aria-label="Preview event"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/events/${event.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                          aria-label="Edit event"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEventPendingDelete(event)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-600 transition hover:bg-red-50"
                          aria-label="Remove event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
              {isFetching ? " - updating..." : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNextPage}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {eventPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">
              Remove event?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This removes the schedule and offer/event status from the product.
              The product will remain available as a normal product.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEventPendingDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                disabled={deleteSellerEvent.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteSellerEvent.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Remove event
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
