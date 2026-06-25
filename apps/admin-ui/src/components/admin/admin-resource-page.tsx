"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import type { AdminListResponse, AdminRecord, Pagination } from "@/types/admin";

type ResourceKey =
  | "orders"
  | "payments"
  | "products"
  | "events"
  | "users"
  | "sellers";

type Column = {
  label: string;
  render: (item: AdminRecord) => string;
  align?: "left" | "right";
};

type ResourceConfig = {
  title: string;
  description: string;
  endpoint: string;
  searchPlaceholder: string;
  columns: Column[];
};

const getNested = (item: AdminRecord, path: string) =>
  path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;

    return (value as Record<string, unknown>)[key];
  }, item);

const text = (value: unknown, fallback = "-") => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";

  return fallback;
};

const money = (value: unknown, currency: unknown = "usd") => {
  const amount = typeof value === "number" ? value : Number(value || 0);
  const code = typeof currency === "string" ? currency.toUpperCase() : "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const date = (value: unknown) => {
  if (typeof value !== "string") return "-";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  orders: {
    title: "Orders",
    description: "Read-only overview of marketplace seller orders.",
    endpoint: "/orders",
    searchPlaceholder: "Search order, product, session...",
    columns: [
      { label: "Order", render: (item) => text(item.orderNumber || item.id) },
      { label: "Customer", render: (item) => text(getNested(item, "customer.name")) },
      { label: "Seller", render: (item) => text(getNested(item, "seller.name")) },
      { label: "Status", render: (item) => text(item.status) },
      {
        label: "Total",
        render: (item) => money(item.total, item.currency),
        align: "right",
      },
      { label: "Created", render: (item) => date(item.createdAt) },
    ],
  },
  payments: {
    title: "Payments",
    description: "Payment records and commission totals without double-counting.",
    endpoint: "/payments",
    searchPlaceholder: "Search session or payment intent...",
    columns: [
      { label: "Session", render: (item) => text(item.sessionId) },
      { label: "Customer", render: (item) => text(getNested(item, "customer.name")) },
      { label: "Status", render: (item) => text(item.paymentStatus) },
      {
        label: "Gross",
        render: (item) => money(item.total, item.currency),
        align: "right",
      },
      {
        label: "Commission",
        render: (item) => money(item.commissionAmount, item.currency),
        align: "right",
      },
      { label: "Created", render: (item) => date(item.createdAt) },
    ],
  },
  products: {
    title: "Products",
    description: "Catalog monitoring for active, pending, draft, and deleted items.",
    endpoint: "/products",
    searchPlaceholder: "Search product, slug, category...",
    columns: [
      { label: "Product", render: (item) => text(item.title) },
      { label: "Shop", render: (item) => text(getNested(item, "shop.name")) },
      { label: "Status", render: (item) => text(item.status) },
      {
        label: "Price",
        render: (item) => money(item.sale_price),
        align: "right",
      },
      { label: "Stock", render: (item) => text(item.stock), align: "right" },
      { label: "Created", render: (item) => date(item.createdAt) },
    ],
  },
  events: {
    title: "Events",
    description: "Event products and their available analytics signals.",
    endpoint: "/events",
    searchPlaceholder: "Search event product...",
    columns: [
      { label: "Event", render: (item) => text(item.title) },
      { label: "Shop", render: (item) => text(getNested(item, "shop.name")) },
      { label: "Status", render: (item) => text(item.status) },
      { label: "Starts", render: (item) => date(item.starting_date) },
      { label: "Ends", render: (item) => date(item.ending_date) },
      { label: "Sales", render: (item) => text(item.totalSales), align: "right" },
    ],
  },
  users: {
    title: "Users",
    description: "Customer account overview for support and operations.",
    endpoint: "/users",
    searchPlaceholder: "Search customer name or email...",
    columns: [
      { label: "Name", render: (item) => text(item.name) },
      { label: "Email", render: (item) => text(item.email) },
      {
        label: "Following",
        render: (item) => text(item.followingCount),
        align: "right",
      },
      { label: "Joined", render: (item) => date(item.createdAt) },
    ],
  },
  sellers: {
    title: "Sellers",
    description: "Seller accounts, shops, Stripe status, and marketplace activity.",
    endpoint: "/sellers",
    searchPlaceholder: "Search seller, email, country...",
    columns: [
      { label: "Seller", render: (item) => text(item.name) },
      { label: "Email", render: (item) => text(item.email) },
      { label: "Shop", render: (item) => text(getNested(item, "shop.name")) },
      { label: "Status", render: (item) => text(item.status) },
      {
        label: "Products",
        render: (item) => text(getNested(item, "stats.productCount")),
        align: "right",
      },
      { label: "Joined", render: (item) => date(item.createdAt) },
    ],
  },
};

const getBadgeClass = (value: string) => {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("active") ||
    normalized.includes("succeeded") ||
    normalized.includes("delivered") ||
    normalized.includes("earned")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("ordered") ||
    normalized.includes("processing")
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("cancelled") ||
    normalized.includes("refunded") ||
    normalized.includes("disabled")
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
};

export function AdminResourcePage({ resource }: { resource: ResourceKey }) {
  const config = resourceConfigs[resource];
  const [items, setItems] = useState<AdminRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const url = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "12",
    });

    if (activeQuery) {
      params.set("q", activeQuery);
    }

    return `${config.endpoint}?${params.toString()}`;
  }, [activeQuery, config.endpoint, page]);

  useEffect(() => {
    setIsLoading(true);
    setError("");

    adminFetch<AdminListResponse<AdminRecord>>(url)
      .then((response) => {
        setItems(response.data);
        setPagination(response.pagination);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : `${config.title} failed to load`,
        );
      })
      .finally(() => setIsLoading(false));
  }, [config.title, url]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setActiveQuery(query.trim());
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">Admin</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {config.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {config.description}
          </p>
        </div>
        <form onSubmit={handleSearch} className="w-full lg:max-w-sm">
          <label className="sr-only" htmlFor={`${resource}-search`}>
            Search {config.title}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-300/25">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              id={`${resource}-search`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={config.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-slate-500">
                {config.columns.map((column) => (
                  <th
                    key={column.label}
                    className={`px-4 py-3 ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-stone-100">
                      {config.columns.map((column) => (
                        <td key={column.label} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-stone-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : items.map((item) => (
                    <tr
                      key={String(item.id)}
                      className="border-b border-stone-100 transition hover:bg-amber-50/40"
                    >
                      {config.columns.map((column) => {
                        const value = column.render(item);
                        const looksLikeStatus =
                          column.label === "Status" || column.label === "Payment";

                        return (
                          <td
                            key={column.label}
                            className={`px-4 py-4 ${
                              column.align === "right"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {looksLikeStatus ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getBadgeClass(
                                  value,
                                )}`}
                              >
                                {value}
                              </span>
                            ) : (
                              <span className="font-medium text-slate-700">
                                {value}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && !error && items.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No {config.title.toLowerCase()} found.
          </div>
        )}

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {pagination && (
          <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} -{" "}
              {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || isLoading}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                className="rounded-xl border border-stone-200 px-3 py-2 font-semibold transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border border-stone-200 px-3 py-2 font-semibold transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
