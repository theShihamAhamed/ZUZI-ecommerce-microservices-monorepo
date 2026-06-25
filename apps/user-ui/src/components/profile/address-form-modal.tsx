"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { CountrySelect } from "@/components/profile/country-select";
import {
  ShippingAddressFormData,
  shippingAddressSchema,
} from "@/constants/profile.schema";
import { ShippingAddress } from "@/types/profile";

interface AddressFormModalProps {
  mode: "create" | "edit";
  address?: ShippingAddress;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: ShippingAddressFormData) => void;
}

const getDefaultValues = (
  address?: ShippingAddress,
): ShippingAddressFormData => ({
  fullName: address?.fullName || "",
  phone: address?.phone || "",
  addressLine1: address?.addressLine1 || "",
  addressLine2: address?.addressLine2 || "",
  city: address?.city || "",
  state: address?.state || "",
  postalCode: address?.postalCode || "",
  country: address?.country || "",
  isDefault: address?.isDefault || false,
});

export function AddressFormModal({
  mode,
  address,
  isSubmitting,
  onClose,
  onSubmit,
}: AddressFormModalProps) {
  const isCurrentDefault = mode === "edit" && address?.isDefault;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ShippingAddressFormData>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: getDefaultValues(address),
  });

  useEffect(() => {
    reset(getDefaultValues(address));
  }, [address, reset]);

  const handleFormSubmit = (data: ShippingAddressFormData) => {
    onSubmit({
      ...data,
      isDefault: isCurrentDefault ? true : data.isDefault,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {mode === "create" ? "Add new address" : "Edit address"}
            </h2>
            <p className="text-sm text-gray-500">
              Save a shipping destination for checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-gray-600 transition hover:bg-stone-50 hover:text-gray-900"
            aria-label="Close address form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Full name
              </label>
              <input
                type="text"
                className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                  errors.fullName ? "border-red-300" : "border-stone-200"
                }`}
                aria-invalid={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.fullName.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                  errors.phone ? "border-red-300" : "border-stone-200"
                }`}
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">
                Address line 1
              </label>
              <input
                type="text"
                className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                  errors.addressLine1 ? "border-red-300" : "border-stone-200"
                }`}
                aria-invalid={!!errors.addressLine1}
                {...register("addressLine1")}
              />
              {errors.addressLine1 ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.addressLine1.message}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">
                Address line 2
              </label>
              <input
                type="text"
                className="mt-2 block w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                {...register("addressLine2")}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                City
              </label>
              <input
                type="text"
                className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                  errors.city ? "border-red-300" : "border-stone-200"
                }`}
                aria-invalid={!!errors.city}
                {...register("city")}
              />
              {errors.city ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.city.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                State
              </label>
              <input
                type="text"
                className="mt-2 block w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                {...register("state")}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Postal code
              </label>
              <input
                type="text"
                className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                  errors.postalCode ? "border-red-300" : "border-stone-200"
                }`}
                aria-invalid={!!errors.postalCode}
                {...register("postalCode")}
              />
              {errors.postalCode ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.postalCode.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="shipping-country"
                className="block text-sm font-semibold text-gray-700"
              >
                Country
              </label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CountrySelect
                    id="shipping-country"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={!!errors.country}
                  />
                )}
              />
              {errors.country ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.country.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            {isCurrentDefault ? (
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                Current default address
              </span>
            ) : (
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  {...register("isDefault")}
                />
                Make this my default address
              </label>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {mode === "create" ? "Add address" : "Save address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
