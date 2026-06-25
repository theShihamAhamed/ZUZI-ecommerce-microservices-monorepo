"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Camera,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useSellerShop,
  useUpdateSellerShop,
  useUploadShopImage,
} from "@/hooks/useShop";
import { ImageAsset } from "@/types/shop";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:bg-slate-50";
const labelClass = "text-sm font-semibold text-slate-800";
const hintClass = "mt-1 text-xs text-slate-500";

interface ShopSettingsForm {
  name: string;
  bio: string;
  category: string;
  address: string;
  website: string;
  opening_hours: string;
}

const emptyForm: ShopSettingsForm = {
  name: "",
  bio: "",
  category: "",
  address: "",
  website: "",
  opening_hours: "",
};

const getAvatarImage = (
  avatar: ImageAsset | null | undefined,
): ImageAsset | null => {
  if (!avatar) return null;
  return avatar.url && avatar.fileId ? avatar : null;
};

const getUploadErrorMessage = (error: unknown) =>
  (error as any)?.response?.data?.message ||
  (error as Error)?.message ||
  "Image upload failed";

export default function SellerSettingsPage() {
  const shopQuery = useSellerShop();
  const updateShop = useUpdateSellerShop();
  const uploadImage = useUploadShopImage();
  const [form, setForm] = useState<ShopSettingsForm>(emptyForm);
  const [avatarImage, setAvatarImage] = useState<ImageAsset | null>(null);
  const [coverBanner, setCoverBanner] = useState<ImageAsset | null>(null);
  const [hasAvatarChanged, setHasAvatarChanged] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<
    "avatar" | "banner" | null
  >(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    const shop = shopQuery.data?.shop;
    if (!shop) return;

    setForm({
      name: shop.name || "",
      bio: shop.bio || "",
      category: shop.category || "",
      address: shop.address || "",
      website: shop.website || "",
      opening_hours: shop.opening_hours || "",
    });
    setAvatarImage(getAvatarImage(shop.avatar));
    setCoverBanner(shop.coverBanner || null);
    setHasAvatarChanged(false);
  }, [shopQuery.data?.shop]);

  const updateField = (field: keyof ShopSettingsForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: "avatar" | "banner",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image is too large. Please upload an image under 5MB.");
      return;
    }

    setUploadingTarget(target);

    try {
      const response = await uploadImage.mutateAsync(file);

      if (target === "avatar") {
        setAvatarImage({
          fileId: response.fileId,
          url: response.url,
        });
        setHasAvatarChanged(true);
      } else {
        setCoverBanner({
          url: response.url,
          fileId: response.fileId,
        });
      }

      toast.success(target === "avatar" ? "Avatar uploaded" : "Banner uploaded");
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Shop name is required");
      return;
    }

    if (!form.category.trim()) {
      toast.error("Shop category is required");
      return;
    }

    if (!form.address.trim()) {
      toast.error("Shop address is required");
      return;
    }

    try {
      await updateShop.mutateAsync({
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        category: form.category.trim(),
        address: form.address.trim(),
        website: form.website.trim() || null,
        opening_hours: form.opening_hours.trim() || null,
        coverBanner,
        ...(hasAvatarChanged ? { avatar: avatarImage } : {}),
      });
      setHasAvatarChanged(false);
      toast.success("Shop settings saved");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save shop settings",
      );
    }
  };

  if (shopQuery.isLoading) {
    return (
      <main className="min-h-screen p-4 text-slate-900 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Loading shop settings...
          </p>
        </div>
      </main>
    );
  }

  if (shopQuery.isError) {
    return (
      <main className="min-h-screen p-4 text-slate-900 sm:p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            Unable to load shop settings
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => shopQuery.refetch()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Settings className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold text-slate-950">
              Shop Settings
            </h1>
            <p className="mt-2 max-w-3xl break-words text-sm text-slate-500">
              Keep your public shop identity, details, and storefront images up
              to date.
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Shop identity
            </h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <label htmlFor="shop-name" className={labelClass}>
                  Shop name
                </label>
                <input
                  id="shop-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={inputClass}
                  placeholder="Your shop name"
                  required
                />
              </div>

              <div>
                <label htmlFor="shop-category" className={labelClass}>
                  Category
                </label>
                <select
                  id="shop-category"
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  className={inputClass}
                  required
                >
                  <option value="">Select category</option>
                  {SHOP_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="shop-bio" className={labelClass}>
                  Bio
                </label>
                <textarea
                  id="shop-bio"
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  rows={5}
                  className={inputClass}
                  placeholder="Tell customers about your shop."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Contact/details
            </h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label htmlFor="shop-address" className={labelClass}>
                  Address
                </label>
                <textarea
                  id="shop-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="Business address"
                  required
                />
              </div>

              <div>
                <label htmlFor="shop-website" className={labelClass}>
                  Website
                </label>
                <input
                  id="shop-website"
                  type="url"
                  value={form.website}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                  className={inputClass}
                  placeholder="https://example.com"
                />
                <p className={hintClass}>Leave blank if you do not use one.</p>
              </div>

              <div>
                <label htmlFor="shop-opening-hours" className={labelClass}>
                  Opening hours
                </label>
                <input
                  id="shop-opening-hours"
                  value={form.opening_hours}
                  onChange={(event) =>
                    updateField("opening_hours", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Mon-Fri 9:00 AM - 6:00 PM"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-red-700">
                  Danger zone
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Account deletion needs additional backend safety rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(true)}
                className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Shop images
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className={labelClass}>Avatar/logo</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                    {avatarImage?.url ? (
                      <img
                        src={avatarImage.url}
                        alt="Shop avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                    {uploadingTarget === "avatar" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Upload avatar
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={Boolean(uploadingTarget)}
                      onChange={(event) => handleImageUpload(event, "avatar")}
                    />
                  </label>
                </div>
                <p className={hintClass}>JPG, PNG, or WEBP under 5MB.</p>
              </div>

              <div>
                <p className={labelClass}>Cover/banner</p>
                <div className="mt-3 aspect-[16/7] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {coverBanner?.url ? (
                    <img
                      src={coverBanner.url}
                      alt="Shop banner preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <label className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                  {uploadingTarget === "banner" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  Upload banner
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={Boolean(uploadingTarget)}
                    onChange={(event) => handleImageUpload(event, "banner")}
                  />
                </label>
                <p className={hintClass}>Wide images work best. Max 5MB.</p>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={updateShop.isPending || Boolean(uploadingTarget)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateShop.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {updateShop.isPending ? "Saving..." : "Save settings"}
          </button>
        </aside>
      </form>

      {showDeleteAccountModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="delete-account-title"
                    className="text-lg font-semibold text-slate-950"
                  >
                    Delete account
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    This is a placeholder for a later protected flow.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                aria-label="Close delete account dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-900">
              Account deletion is not available yet. This action requires
              additional safety rules for products, orders, payments, and shop
              data.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
