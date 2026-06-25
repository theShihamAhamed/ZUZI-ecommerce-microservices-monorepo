"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/constants/navigation";
import { ProductSort } from "@/types/product";

export interface ProductsPageFilters {
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  color?: string;
  size?: string;
  sort?: ProductSort;
}

interface ProductsFilterSidebarProps {
  currentFilters: ProductsPageFilters;
  activeFilterCount?: number;
  onApply: (nextFilters: ProductsPageFilters) => void;
  onClear: () => void;
}

interface DraftFilters {
  category: string;
  subCategory: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  rating: string;
  color: string;
  size: string;
  sort: ProductSort;
}

const DEFAULT_SORT: ProductSort = "popular";

const sortOptions: Array<{ label: string; value: ProductSort }> = [
  { label: "Popular", value: "popular" },
  { label: "Latest", value: "latest" },
  { label: "Price low to high", value: "price_low" },
  { label: "Price high to low", value: "price_high" },
];

const ratingOptions = [
  { label: "Any rating", value: "" },
  { label: "4 and above", value: "4" },
  { label: "3 and above", value: "3" },
  { label: "2 and above", value: "2" },
  { label: "1 and above", value: "1" },
];

const inputClass =
  "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const selectClass = `${inputClass} appearance-none pr-9`;

const toDraftFilters = (filters: ProductsPageFilters): DraftFilters => ({
  category: filters.category || "",
  subCategory: filters.subCategory || "",
  brand: filters.brand || "",
  minPrice: filters.minPrice ? String(filters.minPrice) : "",
  maxPrice: filters.maxPrice ? String(filters.maxPrice) : "",
  rating: filters.rating ? String(filters.rating) : "",
  color: filters.color || "",
  size: filters.size || "",
  sort: filters.sort || DEFAULT_SORT,
});

const trimValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const parsePositiveNumber = (value: string) => {
  if (!value.trim()) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export function ProductsFilterSidebar({
  currentFilters,
  activeFilterCount = 0,
  onApply,
  onClear,
}: ProductsFilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(() =>
    toDraftFilters(currentFilters),
  );

  useEffect(() => {
    setDraftFilters(toDraftFilters(currentFilters));
  }, [
    currentFilters.brand,
    currentFilters.category,
    currentFilters.color,
    currentFilters.maxPrice,
    currentFilters.minPrice,
    currentFilters.rating,
    currentFilters.size,
    currentFilters.sort,
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
      brand: trimValue(draftFilters.brand),
      minPrice: parsePositiveNumber(draftFilters.minPrice),
      maxPrice: parsePositiveNumber(draftFilters.maxPrice),
      rating: parsePositiveNumber(draftFilters.rating),
      color: trimValue(draftFilters.color),
      size: trimValue(draftFilters.size),
      sort: draftFilters.sort,
    });
  };

  const handleClear = () => {
    setDraftFilters(toDraftFilters({ sort: DEFAULT_SORT }));
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
            Filters
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
            <h2 className="text-base font-bold text-gray-900">Filters</h2>
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                {activeFilterCount}
              </span>
            ) : null}
          </div>

          <div className="mt-4 space-y-4 lg:mt-5">
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

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                Brand
              </span>
              <input
                type="text"
                value={draftFilters.brand}
                onChange={(event) => updateDraft("brand", event.target.value)}
                placeholder="Brand name"
                className={`${inputClass} mt-2`}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                  Min price
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draftFilters.minPrice}
                  onChange={(event) =>
                    updateDraft("minPrice", event.target.value)
                  }
                  placeholder="0"
                  className={`${inputClass} mt-2`}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                  Max price
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draftFilters.maxPrice}
                  onChange={(event) =>
                    updateDraft("maxPrice", event.target.value)
                  }
                  placeholder="500"
                  className={`${inputClass} mt-2`}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                Rating
              </span>
              <div className="relative mt-2">
                <select
                  value={draftFilters.rating}
                  onChange={(event) => updateDraft("rating", event.target.value)}
                  className={selectClass}
                >
                  {ratingOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                  Color
                </span>
                <input
                  type="text"
                  value={draftFilters.color}
                  onChange={(event) => updateDraft("color", event.target.value)}
                  placeholder="Black"
                  className={`${inputClass} mt-2`}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                  Size
                </span>
                <input
                  type="text"
                  value={draftFilters.size}
                  onChange={(event) => updateDraft("size", event.target.value)}
                  placeholder="M"
                  className={`${inputClass} mt-2`}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                Sort
              </span>
              <div className="relative mt-2">
                <select
                  value={draftFilters.sort}
                  onChange={(event) =>
                    updateDraft("sort", event.target.value as ProductSort)
                  }
                  className={selectClass}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
