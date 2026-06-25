"use client";

import { Check } from "lucide-react";
import {
  ProductOptionGroup,
  SelectedProductOptions,
} from "@/types/product";

interface ProductOptionSelectorProps {
  optionGroups: ProductOptionGroup[];
  selectedOptions: SelectedProductOptions;
  onChange: (selectedOptions: SelectedProductOptions) => void;
  error?: string;
}

const isHexColor = (value: string) =>
  /^#([0-9A-F]{3}){1,2}$/i.test(value.trim());

const getOptionLabel = (group: ProductOptionGroup) =>
  `${group.name}${group.required ? " *" : ""}`;

export function ProductOptionSelector({
  optionGroups,
  selectedOptions,
  onChange,
  error,
}: ProductOptionSelectorProps) {
  if (optionGroups.length === 0) return null;

  const handleSelect = (group: ProductOptionGroup, value: string) => {
    onChange({
      ...selectedOptions,
      [group.name]: value,
    });
  };

  return (
    <div className="mt-6 space-y-5">
      {optionGroups.map((group) => (
        <div key={group.id}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-gray-900">
              {getOptionLabel(group)}
            </p>
            {!group.required ? (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                Optional
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = selectedOptions[group.name] === value;
              const isColorGroup = group.name.toLowerCase() === "color";
              const canShowSwatch = isColorGroup && isHexColor(value);

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelect(group, value)}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-100"
                      : "border-stone-200 bg-white text-gray-700 hover:border-amber-200 hover:bg-amber-50"
                  }`}
                  aria-pressed={isSelected}
                >
                  {canShowSwatch ? (
                    <span
                      className="h-4 w-4 rounded-full border border-stone-300"
                      style={{ backgroundColor: value }}
                    />
                  ) : null}
                  <span>{value}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

