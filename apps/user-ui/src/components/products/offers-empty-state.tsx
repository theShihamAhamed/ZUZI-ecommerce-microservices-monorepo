"use client";

import { BadgePercent } from "lucide-react";
import { EventProductStatus } from "@/types/product";

interface OffersEmptyStateProps {
  status: Exclude<EventProductStatus, "expired">;
  onClearFilters: () => void;
}

export function OffersEmptyState({
  status,
  onClearFilters,
}: OffersEmptyStateProps) {
  const title =
    status === "active"
      ? "No active offers found"
      : status === "upcoming"
        ? "No upcoming offers found"
        : status === "ended"
          ? "No ended offers found"
          : "No offers found";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <BadgePercent className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
        Try changing your filters or check back later for new deals.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-bold text-white transition hover:bg-gray-800"
      >
        Clear filters
      </button>
    </div>
  );
}
