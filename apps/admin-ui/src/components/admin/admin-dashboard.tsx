"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  CreditCard,
  ShoppingCart,
  Store,
  UsersRound,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

type DashboardSummary = {
  totals: Record<string, number>;
  recentOrders: {
    id: string;
    orderNumber: string | null;
    total: number;
    currency: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
};

const formatMoney = (amount: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<{ success: boolean; data: DashboardSummary }>(
      "/dashboard/summary",
    )
      .then((response) => setSummary(response.data))
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Dashboard failed to load",
        );
      });
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-stone-200 bg-white"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Gross revenue",
      value: formatMoney(summary.totals.grossRevenue),
      icon: CreditCard,
    },
    {
      label: "Earned commission",
      value: formatMoney(summary.totals.earnedCommission),
      icon: CreditCard,
    },
    {
      label: "Orders",
      value: String(summary.totals.orders || 0),
      icon: ShoppingCart,
    },
    {
      label: "Products",
      value: String(summary.totals.products || 0),
      icon: Boxes,
    },
    {
      label: "Users",
      value: String(summary.totals.users || 0),
      icon: UsersRound,
    },
    {
      label: "Sellers",
      value: String(summary.totals.sellers || 0),
      icon: Store,
    },
    {
      label: "Active products",
      value: String(summary.totals.activeProducts || 0),
      icon: Boxes,
    },
    {
      label: "Pending commission",
      value: formatMoney(summary.totals.pendingCommission),
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold text-amber-700">Overview</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Marketplace operations
        </h2>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-950">
                    {card.value}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Recent orders</h3>
            <p className="text-sm text-slate-500">
              Latest seller-order records across the marketplace.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Payment</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-stone-100">
                  <td className="py-3 pr-4 font-semibold text-slate-900">
                    {order.orderNumber || order.id}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{order.status}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {order.paymentStatus}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-900">
                    {formatMoney(order.total, order.currency)}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.recentOrders.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No orders yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
