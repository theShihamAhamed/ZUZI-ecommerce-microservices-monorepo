"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/constants/navigation";

export interface ShopsPageFilters {
  category?: string;
  q?: string;
}

interface ShopsFilterSidebarProps {
  currentFilters: ShopsPageFilters;
  activeFilterCount?: number;
  onApply: (nextFilters: ShopsPageFilters) => void;
  onClear: () => void;
}

interface DraftFilters {
  category: string;
  q: string;
}

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const selectClass = `${inputClass} appearance-none pr-9`;

const toDraftFilters = (filters: ShopsPageFilters): DraftFilters => ({
  category: filters.category || "",
  q: filters.q || "",
});

const trimValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

export function ShopsFilterSidebar({
  currentFilters,
  activeFilterCount = 0,
  onApply,
  onClear,
}: ShopsFilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(() =>
    toDraftFilters(currentFilters),
  );

  useEffect(() => {
    setDraftFilters(toDraftFilters(currentFilters));
  }, [currentFilters.category, currentFilters.q]);

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
      q: trimValue(draftFilters.q),
    });
  };

  const handleClear = () => {
    setDraftFilters(toDraftFilters({}));
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
            Shop filters
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
            <h2 className="text-base font-bold text-gray-900">
              Shop filters
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
                Search
              </span>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={draftFilters.q}
                  onChange={(event) => updateDraft("q", event.target.value)}
                  placeholder="Search shops"
                  className={`${inputClass} pl-9`}
                />
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
