"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { SellerFormData } from "@/app/(auth)/sign-up/page";
import { useAuth } from "@/hooks/useAuth";

interface Step3Props {
  formData: SellerFormData;
  updateFormData: (data: Partial<SellerFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SHOP_CATEGORIES = [
  "Electronics",
  "Fashion & Apparel",
  "Home & Garden",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Books & Media",
  "Grocery & Food",
  "Health & Wellness",
  "Toys & Games",
  "Automotive",
  "Services",
];

export const Step3ShopSetup: React.FC<Step3Props> = ({
  formData,
  updateFormData,
  onNext,
  onBack,
}) => {
  const { createShop } = useAuth();
  const [wordCount, setWordCount] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      shopName: formData.shopName || "",
      shopBio: formData.shopBio || "",
      businessAddress: formData.businessAddress || "",
      openingHours: formData.openingHours || "",
      websiteUrl: formData.websiteUrl || "",
      shopCategory: formData.shopCategory || "",
    },
  });

  const shopBio = watch("shopBio");

  // Update word count
  useEffect(() => {
    const words = shopBio ? shopBio.trim().split(/\s+/).filter(Boolean) : [];
    setWordCount(words.length);
  }, [shopBio]);

  const onSubmit = async (data: any) => {
    setApiError(null);
    try {
      const response = await createShop.mutateAsync(data); // sellerId from cookie/session
      if (response.success && response.shopId) {
        updateFormData({ ...data, shopId: response.shopId });
        onNext();
      } else {
        setApiError(
          response.error || "Failed to create shop. Please try again.",
        );
      }
    } catch (error: any) {
      setApiError(
        error?.response?.data?.message || "An unexpected error occurred",
      );
    } finally {
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Shop Setup</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tell us about your business.
          </p>
        </div>

        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Shop creation failed
              </p>
              <p className="text-sm text-red-600 mt-1">{apiError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Shop Name */}
          <div>
            <label
              htmlFor="shopName"
              className="block text-sm font-medium text-gray-700"
            >
              Shop Name
            </label>
            <input
              type="text"
              id="shopName"
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.shopName ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
              {...register("shopName", { required: "Shop name is required" })}
            />
            {errors.shopName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.shopName.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This will be visible to customers.
            </p>
          </div>

          {/* Shop Category */}
          <div>
            <label
              htmlFor="shopCategory"
              className="block text-sm font-medium text-gray-700"
            >
              Shop Category
            </label>
            <select
              id="shopCategory"
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.shopCategory ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white`}
              {...register("shopCategory", {
                required: "Please select a category",
              })}
            >
              <option value="">Select category</option>
              {SHOP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.shopCategory && (
              <p className="mt-1 text-sm text-red-600">
                {errors.shopCategory.message}
              </p>
            )}
          </div>

          {/* Shop Bio */}
          <div>
            <div className="flex justify-between">
              <label
                htmlFor="shopBio"
                className="block text-sm font-medium text-gray-700"
              >
                Shop Bio
              </label>
              <span
                className={`text-xs ${wordCount > 100 ? "text-red-600 font-medium" : "text-gray-500"}`}
              >
                {wordCount}/100 words
              </span>
            </div>
            <textarea
              id="shopBio"
              rows={4}
              placeholder="Tell customers about your shop, what you sell, and what makes you unique..."
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.shopBio ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
              {...register("shopBio", {
                validate: (value) => {
                  const words = value
                    ? value.trim().split(/\s+/).filter(Boolean)
                    : [];
                  return words.length <= 100 || "Bio cannot exceed 100 words";
                },
              })}
            />
            {errors.shopBio && (
              <p className="mt-1 text-sm text-red-600">
                {errors.shopBio.message}
              </p>
            )}
          </div>

          {/* Business Address */}
          <div>
            <label
              htmlFor="businessAddress"
              className="block text-sm font-medium text-gray-700"
            >
              Business Address
            </label>
            <textarea
              id="businessAddress"
              rows={3}
              placeholder="Enter your full business address..."
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.businessAddress ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
              {...register("businessAddress", {
                required: "Business address is required",
              })}
            />
            {errors.businessAddress && (
              <p className="mt-1 text-sm text-red-600">
                {errors.businessAddress.message}
              </p>
            )}
          </div>

          {/* Opening Hours */}
          <div>
            <label
              htmlFor="openingHours"
              className="block text-sm font-medium text-gray-700"
            >
              Opening Hours
            </label>
            <input
              type="text"
              id="openingHours"
              placeholder="e.g. Mon–Fri 9:00 AM – 6:00 PM"
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.openingHours ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
              {...register("openingHours")}
            />
            <p className="mt-1 text-xs text-gray-500">
              Let customers know when you're available.
            </p>
          </div>

          {/* Website URL */}
          <div>
            <label
              htmlFor="websiteUrl"
              className="block text-sm font-medium text-gray-700"
            >
              Website URL{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              id="websiteUrl"
              placeholder="https://example.com"
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.websiteUrl ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm`}
              {...register("websiteUrl")}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onBack}
              disabled={createShop.isPending}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>

            <button
              type="submit"
              disabled={createShop.isPending}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {createShop.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Shop...
                </>
              ) : (
                <>
                  Create Shop
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
