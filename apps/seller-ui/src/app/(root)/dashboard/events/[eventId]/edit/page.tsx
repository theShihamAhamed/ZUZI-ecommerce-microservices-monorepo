"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Edit3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { getProductThumbnail } from "@/utils/image-assets";
import toast from "react-hot-toast";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";
const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const validateDateRange = (start: string, end: string) => {
  if (!start || !end) return "Start and end dates are required.";

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Use valid start and end dates.";
  }

  if (endDate <= startDate) {
    return "End date must be after start date.";
  }

  return "";
};

const getNormalBuyingPrice = (event?: {
  sale_price?: number;
  regular_price?: number;
} | null) => {
  if (!event) return 0;
  return Number.isFinite(event.sale_price) && Number(event.sale_price) > 0
    ? Number(event.sale_price)
    : Number(event.regular_price || 0);
};

const validateEventSpecialPrice = (value: string, normalBuyingPrice: number) => {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return "Event special price must be a valid number.";
  }

  if (parsed <= 0) {
    return "Event special price must be greater than zero.";
  }

  if (parsed >= normalBuyingPrice) {
    return "Event special price must be lower than the normal sale price.";
  }

  return "";
};

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? Number(price) : 0);

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = params.eventId;
  const { getSellerEvent, updateSellerEvent } = useEvents();
  const eventQuery = getSellerEvent(eventId);
  const event = eventQuery.data?.event || eventQuery.data?.product || null;
  const [startingDate, setStartingDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [eventSpecialPrice, setEventSpecialPrice] = useState("");
  const dateError = validateDateRange(startingDate, endingDate);
  const normalBuyingPrice = getNormalBuyingPrice(event);
  const eventPriceError = validateEventSpecialPrice(
    eventSpecialPrice,
    normalBuyingPrice,
  );

  useEffect(() => {
    if (!event) return;

    setStartingDate(toDateTimeLocalValue(event.starting_date));
    setEndingDate(toDateTimeLocalValue(event.ending_date));
    setEventSpecialPrice(
      typeof event.event_sale_price === "number"
        ? String(event.event_sale_price)
        : "",
    );
  }, [event]);

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (dateError) {
      toast.error(dateError);
      return;
    }

    if (eventPriceError) {
      toast.error(eventPriceError);
      return;
    }

    try {
      const normalizedEventPrice = eventSpecialPrice.trim()
        ? Number(eventSpecialPrice)
        : null;

      await updateSellerEvent.mutateAsync({
        eventId,
        data: {
          starting_date: new Date(startingDate).toISOString(),
          ending_date: new Date(endingDate).toISOString(),
          event_sale_price: normalizedEventPrice,
        },
      });
      toast.success("Event schedule updated");
      router.push("/dashboard/events");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to update event";
      toast.error(message);
    }
  };

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen p-6 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            Loading event
          </h1>
        </div>
      </div>
    );
  }

  if (eventQuery.isError || !event) {
    const status = (eventQuery.error as any)?.response?.status;

    return (
      <div className="min-h-screen p-6 text-slate-900">
        <Link
          href="/dashboard/events"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            {status === 404 ? "Event not found" : "Unable to load event"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {status === 404
              ? "This event is not available for your shop."
              : "Please try again."}
          </p>
          {status !== 404 ? (
            <button
              type="button"
              onClick={() => eventQuery.refetch()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const image = getProductThumbnail(event) || PRODUCT_PLACEHOLDER_IMAGE;

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen space-y-6 p-4 text-slate-900 sm:p-6"
    >
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Link
          href="/dashboard/events"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>
        <h1 className="text-2xl font-semibold text-slate-950">Edit Event</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Update the event schedule. Product details remain managed from the
          normal product editor.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src={image}
            alt={event.title}
            className="h-24 w-24 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-950">
              {event.title}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {event.slug}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{formatPrice(event.regular_price)} regular</span>
              <span>{formatPrice(event.sale_price)}</span>
              {typeof event.event_sale_price === "number" ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {formatPrice(event.event_sale_price)} event
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {event.status}
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/products/${event.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <Edit3 className="h-4 w-4" />
            Edit full product details
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Event pricing
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update the event-only special price without changing the normal
            product price.
          </p>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Regular price
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {formatPrice(event.regular_price)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Normal sale price
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {formatPrice(normalBuyingPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current effective price
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {formatPrice(event.effective_price ?? normalBuyingPrice)}
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            Event special price
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={eventSpecialPrice}
            onChange={(event) => setEventSpecialPrice(event.target.value)}
            placeholder="Leave blank for normal sale price"
            className={`${inputClass} w-full`}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Clear this field to remove the event-only price.
        </p>
        {eventPriceError ? (
          <p className="mt-2 text-sm font-semibold text-red-600">
            {eventPriceError}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-950">
            Event schedule
          </h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Start date *
            </span>
            <input
              type="datetime-local"
              value={startingDate}
              onChange={(event) => setStartingDate(event.target.value)}
              className={`${inputClass} w-full`}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              End date *
            </span>
            <input
              type="datetime-local"
              value={endingDate}
              onChange={(event) => setEndingDate(event.target.value)}
              className={`${inputClass} w-full`}
            />
          </label>
        </div>
        {dateError ? (
          <p className="mt-3 text-sm font-semibold text-red-600">
            {dateError}
          </p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-emerald-700">
            Schedule looks good.
          </p>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={
            updateSellerEvent.isPending ||
            Boolean(dateError) ||
            Boolean(eventPriceError)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateSellerEvent.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Save schedule
        </button>
      </div>
    </form>
  );
}
