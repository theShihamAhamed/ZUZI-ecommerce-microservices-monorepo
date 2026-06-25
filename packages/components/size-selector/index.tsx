"use client";

import { Controller } from "react-hook-form";

interface SizeSelectorProps {
  control: any;
  errors?: any;
  submitCount: any;
}

const availableSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function SizeSelector({
  control,
  errors,
  submitCount,
}: SizeSelectorProps) {
  return (
    <div>
      <label className="block font-semibold text-gray-300 mb-1">
        Select Sizes
      </label>

      <Controller
        name="sizes"
        control={control}
        render={({ field }) => {
          const selectedSizes = Array.isArray(field.value) ? field.value : [];

          const toggleSize = (size: string) => {
            field.onChange(
              selectedSizes.includes(size)
                ? selectedSizes.filter((s: string) => s !== size)
                : [...selectedSizes, size],
            );
          };

          return (
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-3 py-1 rounded-md border transition-all ${
                    selectedSizes.includes(size)
                      ? "bg-[#80DEEA] text-black border-[#80DEEA]"
                      : "bg-[#111827] text-gray-200 border-gray-700 hover:bg-gray-700"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          );
        }}
      />

      {submitCount > 0 && errors.sizes && (
        <p className="text-red-500 text-xs mt-1">
          {errors.sizes.message as string}
        </p>
      )}
    </div>
  );
}
