"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  Loader2,
  PackageOpen,
  RefreshCw,
  Search,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useEvents } from "@/hooks/useEvents";
import { useProduct } from "@/hooks/useProduct";
import { SellerProduct } from "@/types/product";
import { getProductThumbnail } from "@/utils/image-assets";
import toast from "react-hot-toast";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";
const AVAILABLE_PRODUCTS_LIMIT = 8;

const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? Number(price) : 0);

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

const getNormalBuyingPrice = (product?: SellerProduct | null) => {
  if (!product) return 0;
  return Number.isFinite(product.sale_price) && product.sale_price > 0
    ? product.sale_price
    : product.regular_price;
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

export default function CreateEventPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<SellerProduct | null>(null);
  const [startingDate, setStartingDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [eventSpecialPrice, setEventSpecialPrice] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const { getShopProducts } = useProduct();
  const { createSellerEvent } = useEvents();
  const queryParams = useMemo(
    () => ({
      page,
      limit: AVAILABLE_PRODUCTS_LIMIT,
      q: debouncedSearchTerm,
      status: "active",
      eventState: "not-event" as const,
      sort: "newest",
    }),
    [debouncedSearchTerm, page],
  );
  const productsQuery = getShopProducts(queryParams);
  const products = productsQuery.data?.products || [];
  const pagination = productsQuery.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;
  const dateError = validateDateRange(startingDate, endingDate);
  const normalBuyingPrice = getNormalBuyingPrice(selectedProduct);
  const eventPriceError = validateEventSpecialPrice(
    eventSpecialPrice,
    normalBuyingPrice,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct) {
      toast.error("Select a product first.");
      return;
    }

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

      await createSellerEvent.mutateAsync({
        productId: selectedProduct.id,
        starting_date: new Date(startingDate).toISOString(),
        ending_date: new Date(endingDate).toISOString(),
        event_sale_price: normalizedEventPrice,
      });
      toast.success("Event created successfully");
      router.push("/dashboard/events");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create event";
      toast.error(message);
    }
  };

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
        <h1 className="text-2xl font-semibold text-slate-950">
          Create Event
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Select one of your active products and turn it into a dated event or
          limited-time offer.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Select product
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Products already marked as events are hidden from this list.
            </p>
          </div>
          <label className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setPage(1);
                setSearchTerm(event.target.value);
              }}
              placeholder="Search products..."
              className={`${inputClass} w-full pl-9`}
            />
          </label>
        </div>

        {productsQuery.isLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : productsQuery.isError ? (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-7 w-7 text-red-600" />
            <p className="mt-3 text-sm font-semibold text-slate-950">
              Unable to load products
            </p>
            <button
              type="button"
              onClick={() => productsQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <PackageOpen className="mx-auto h-9 w-9 text-emerald-600" />
            <h3 className="mt-3 text-base font-semibold text-slate-950">
              Create a product first, then you can turn it into an event.
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Active products that are not already events will appear here.
            </p>
            <Link
              href="/dashboard/create-product"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              Create product
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {products.map((product) => {
                const isSelected = selectedProduct?.id === product.id;
                const image =
                  getProductThumbnail(product) || PRODUCT_PLACEHOLDER_IMAGE;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(product);
                      setEventSpecialPrice("");
                    }}
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-emerald-200"
                    }`}
                  >
                    <img
                      src={image}
                      alt={product.title}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">
                        {product.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {product.slug}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatPrice(product.regular_price)} regular</span>
                        <span>{formatPrice(product.sale_price)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                          {product.status}
                        </span>
                      </span>
                    </span>
                    {isSelected ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
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
          </>
        )}
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
        {startingDate || endingDate ? (
          dateError ? (
            <p className="mt-3 text-sm font-semibold text-red-600">
              {dateError}
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold text-emerald-700">
              Schedule looks good.
            </p>
          )
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Event pricing
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add an optional event-only special price without changing the
            product&apos;s normal sale price.
          </p>
        </div>

        {selectedProduct ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Regular price
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                {formatPrice(selectedProduct.regular_price)}
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
                Event price limit
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                Below {formatPrice(normalBuyingPrice)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Select a product to see its normal pricing context.
          </p>
        )}

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
          Leave blank to use the normal sale price during the event.
        </p>
        {eventPriceError ? (
          <p className="mt-2 text-sm font-semibold text-red-600">
            {eventPriceError}
          </p>
        ) : null}
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
            createSellerEvent.isPending ||
            !selectedProduct ||
            Boolean(dateError) ||
            Boolean(eventPriceError)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createSellerEvent.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Create Event
        </button>
      </div>
    </form>
  );
}
