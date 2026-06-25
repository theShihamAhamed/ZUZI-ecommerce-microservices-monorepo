"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgePercent, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/constants/navigation";
import { EventProductStatus } from "@/types/product";

export type OfferStatusFilter = Exclude<EventProductStatus, "expired">;

export interface OffersPageFilters {
  category?: string;
  subCategory?: string;
  status: OfferStatusFilter;
}

interface OffersFilterSidebarProps {
  currentFilters: OffersPageFilters;
  activeFilterCount?: number;
  onApply: (nextFilters: OffersPageFilters) => void;
  onClear: () => void;
}

interface DraftFilters {
  category: string;
  subCategory: string;
  status: OfferStatusFilter;
}

const DEFAULT_STATUS: OfferStatusFilter = "all";

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const selectClass = `${inputClass} appearance-none pr-9`;

const toDraftFilters = (filters: OffersPageFilters): DraftFilters => ({
  category: filters.category || "",
  subCategory: filters.subCategory || "",
  status: filters.status || DEFAULT_STATUS,
});

const trimValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

export function OffersFilterSidebar({
  currentFilters,
  activeFilterCount = 0,
  onApply,
  onClear,
}: OffersFilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(() =>
    toDraftFilters(currentFilters),
  );

  useEffect(() => {
    setDraftFilters(toDraftFilters(currentFilters));
  }, [
    currentFilters.category,
    currentFilters.status,
    currentFilters.subCategory,
  ]);

  const categoryNames = useMemo(
    () => CATEGORIES.map((category) => category.name),
    [],
  );
  const hasCustomCategory =
    draftFilters.category && !categoryNames.includes(draftFilters.category);

  const updateDraft = (key: keyof DraftFilters, value: string) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onApply({
      category: trimValue(draftFilters.category),
      subCategory: trimValue(draftFilters.subCategory),
      status: draftFilters.status,
    });
  };

  const handleClear = () => {
    setDraftFilters(toDraftFilters({ status: DEFAULT_STATUS }));
    onClear();
  };

  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left lg:hidden"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
            <SlidersHorizontal className="h-4 w-4" />
            Offer filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <form
          onSubmit={handleSubmit}
          className={`${isOpen ? "block" : "hidden"} border-t border-stone-100 p-4 lg:block lg:border-t-0 lg:p-5`}
        >
          <div className="hidden items-center justify-between gap-3 lg:flex">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-gray-900">
              <BadgePercent className="h-4 w-4 text-amber-700" />
              Offer filters
            </h2>
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                {activeFilterCount}
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-4 lg:mt-5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                Offer status
              </span>
              <div className="relative mt-2">
                <select
                  value={draftFilters.status}
                  onChange={(event) =>
                    updateDraft(
                      "status",
                      event.target.value as OfferStatusFilter,
                    )
                  }
                  className={selectClass}
                >
                  <option value="all">All offers</option>
                  <option value="active">Active offers</option>
                  <option value="upcoming">Upcoming offers</option>
                  <option value="ended">Ended offers</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                Category
              </span>
              <div className="relative mt-2">
                <select
                  value={draftFilters.category}
                  onChange={(event) =>
                    updateDraft("category", event.target.value)
                  }
                  className={selectClass}
                >
                  <option value="">All categories</option>
                  {hasCustomCategory ? (
                    <option value={draftFilters.category}>
                      {draftFilters.category}
                    </option>
                  ) : null}
                  {CATEGORIES.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                Sub category
              </span>
              <input
                type="text"
                value={draftFilters.subCategory}
                onChange={(event) =>
                  updateDraft("subCategory", event.target.value)
                }
                placeholder="Sneakers, audio, decor"
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 text-sm font-bold text-gray-800 transition hover:border-amber-300 hover:text-amber-800"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
