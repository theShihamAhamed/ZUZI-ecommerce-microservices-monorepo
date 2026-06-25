"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ChevronRight } from "lucide-react";
import ImagePlaceHolder from "@/components/image-placeholder";
import {
  getOptionGroupValues,
  ProductOptionGroup,
  ProductOptionGroupsEditor,
  normalizeProductOptionGroupsForSubmit,
} from "@/components/products/product-option-groups-editor";
import { useProduct } from "@/hooks/useProduct";
import {
  ImageAsset,
  SellerProduct,
  SellerProductStatus,
  SellerProductUpdatePayload,
} from "@/types/product";
import CusInput from "@shared-components/input";
import CustomSpecifications from "@shared-components/custom-specifications";
import RichTextEditor from "@shared-components/rich-text-editor";
import toast from "react-hot-toast";

type ProductFormImage = ImageAsset & {
  persisted?: boolean;
};

interface ProductSpecification {
  name: string;
  value: string;
}

interface ProductFormValues {
  title: string;
  description: string;
  tags: string;
  warranty: string;
  slug: string;
  brand?: string;
  cash_on_delivery: "yes" | "no";
  category: string;
  subcategory: string;
  detailed_description: string;
  video_url?: string;
  regular_price?: number;
  sale_price?: number;
  stock: number;
  custom_specifications: ProductSpecification[];
  discountCodes: string[];
  starting_date: string;
  ending_date: string;
  status: SellerProductStatus;
}

interface ProductFormProps {
  mode: "create" | "edit";
  productType?: "product" | "event";
  title: string;
  currentBreadcrumb: string;
  product?: SellerProduct | null;
  submitLabel: string;
  pendingLabel: string;
  cancelHref?: string;
  onSubmit: (payload: SellerProductUpdatePayload) => Promise<void>;
}

const sectionClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const inputClass =
  "rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
const selectClass =
  "w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_SIZE_ERROR =
  "Image is too large. Please upload an image under 5MB.";
const PRODUCT_IMAGE_TYPE_ERROR =
  "Only JPG, PNG, and WEBP images are allowed.";
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const getWordCount = (value = "") => {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue.split(/\s+/).length : 0;
};

const getRichTextWordCount = (value = "") => {
  const plainText = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return getWordCount(plainText);
};

const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null;

  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getSpecificationsForForm = (
  specifications: SellerProduct["custom_specifications"],
): ProductSpecification[] => {
  if (Array.isArray(specifications)) {
    return specifications.flatMap((specification) => {
      if (!isRecord(specification)) return [];

      const name =
        typeof specification.name === "string" ? specification.name : "";
      const value =
        typeof specification.value === "string"
          ? specification.value
          : String(specification.value ?? "");

      if (!name && !value) return [];

      return [{ name, value }];
    });
  }

  if (isRecord(specifications)) {
    return Object.entries(specifications).map(([name, value]) => ({
      name,
      value: String(value ?? ""),
    }));
  }

  return [];
};

const getOptionGroupsForForm = (product?: SellerProduct | null) => {
  if (!product) return [];

  const groups: ProductOptionGroup[] = [];
  const seenNames = new Set<string>();
  const rawGroups = product.custom_properties?.optionGroups;

  if (Array.isArray(rawGroups)) {
    rawGroups.forEach((group) => {
      const name = typeof group.name === "string" ? group.name.trim() : "";
      const values = Array.isArray(group.values)
        ? group.values.filter((value): value is string => typeof value === "string")
        : [];

      if (!name || values.length === 0) return;

      const key = name.toLowerCase();
      if (seenNames.has(key)) return;

      seenNames.add(key);
      groups.push({
        id: group.id || key,
        name,
        values,
        required: group.required !== false,
      });
    });
  }

  if (!seenNames.has("color") && product.colors?.length > 0) {
    seenNames.add("color");
    groups.push({
      id: "legacy-color",
      name: "Color",
      values: product.colors,
      required: false,
    });
  }

  if (!seenNames.has("size") && product.sizes?.length > 0) {
    groups.push({
      id: "legacy-size",
      name: "Size",
      values: product.sizes,
      required: false,
    });
  }

  return groups;
};

const getImagesForForm = (product?: SellerProduct | null) => {
  const images: (ProductFormImage | null)[] =
    product?.images?.flatMap((image) => {
      const imageAsset = image as ImageAsset & {
        file_id?: string;
        file_url?: string;
      };
      const url = imageAsset.url || imageAsset.file_url;
      const fileId = imageAsset.fileId || imageAsset.file_id;

      if (!url || !fileId) return [];

      return [
        {
          url,
          fileId,
          persisted: true,
        },
      ];
    }) || [];

  if (images.length === 0 || images.length < 8) {
    images.push(null);
  }

  return images;
};

const validateProductImageFile = (file: File) => {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    return PRODUCT_IMAGE_TYPE_ERROR;
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    return PRODUCT_IMAGE_SIZE_ERROR;
  }

  return "";
};

const getImageUploadErrorMessage = (error: any) => {
  const message = error?.response?.data?.message || error?.message || "";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("5mb") ||
    normalizedMessage.includes("file size") ||
    normalizedMessage.includes("limit_file_size")
  ) {
    return PRODUCT_IMAGE_SIZE_ERROR;
  }

  if (
    normalizedMessage.includes("only jpg") ||
    normalizedMessage.includes("jpeg") ||
    normalizedMessage.includes("webp") ||
    normalizedMessage.includes("not allowed") ||
    normalizedMessage.includes("invalid file type")
  ) {
    return PRODUCT_IMAGE_TYPE_ERROR;
  }

  return "Image upload failed";
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const getDefaultValues = (product?: SellerProduct | null): ProductFormValues => ({
  title: product?.title || "",
  description: product?.short_description || "",
  tags: product?.tags?.join(", ") || "",
  warranty: product?.warranty || "",
  slug: product?.slug || "",
  brand: product?.brand || "",
  cash_on_delivery: product?.cashOnDelivery === "no" ? "no" : "yes",
  category: product?.category || "",
  subcategory: product?.subCategory || "",
  detailed_description: product?.detailed_description || "",
  video_url: product?.video_url || "",
  regular_price: product?.regular_price,
  sale_price: product?.sale_price,
  stock: product?.stock ?? (undefined as unknown as number),
  custom_specifications: getSpecificationsForForm(product?.custom_specifications),
  discountCodes: product?.discount_codes || [],
  starting_date: toDateTimeLocalValue(product?.starting_date),
  ending_date: toDateTimeLocalValue(product?.ending_date),
  status: product?.status || "Active",
});

export function ProductForm({
  mode,
  productType = "product",
  title,
  currentBreadcrumb,
  product,
  submitLabel,
  pendingLabel,
  cancelHref,
  onSubmit,
}: ProductFormProps) {
  const isEventForm = productType === "event";
  const listingHref = isEventForm ? "/dashboard/events" : "/dashboard/products";
  const listingLabel = isEventForm ? "Events" : "Products";
  const imageEntityLabel = isEventForm ? "event" : "product";
  const resolvedCancelHref = cancelHref || listingHref;
  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<ProductFormValues>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: getDefaultValues(product),
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIndexes, setUploadingIndexes] = useState<number[]>([]);
  const [removingIndexes, setRemovingIndexes] = useState<number[]>([]);
  const [images, setImages] = useState<(ProductFormImage | null)[]>(
    getImagesForForm(product),
  );
  const [imageError, setImageError] = useState("");
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>(
    getOptionGroupsForForm(product),
  );
  const [optionGroupError, setOptionGroupError] = useState("");
  const hasUploadedImages = images.some((img) => img !== null);
  const isUploadingAnyImage = uploadingIndexes.length > 0;
  const {
    getCategories,
    getDiscountCodes,
    uploadImage,
    deleteImage,
  } = useProduct();
  const discountCodes = getDiscountCodes.data?.discount_code || [];
  const categories = getCategories.data?.categories || [];
  const subCategoriesData = getCategories.data?.subCategories || [];
  const selectedCategory = watch("category");
  const regularPrice = watch("regular_price");
  const startingDateValue = watch("starting_date");
  const selectedDiscountCodes = watch("discountCodes") || [];

  const subcategories = useMemo(() => {
    return selectedCategory ? subCategoriesData[selectedCategory] || [] : [];
  }, [selectedCategory, subCategoriesData]);

  useEffect(() => {
    reset(getDefaultValues(product));
    setImages(getImagesForForm(product));
    setOptionGroups(getOptionGroupsForForm(product));
    setImageError("");
    setOptionGroupError("");
  }, [product, reset]);

  useEffect(() => {
    if (hasUploadedImages) {
      setImageError("");
    }
  }, [hasUploadedImages]);

  const submitForm = async (data: ProductFormValues) => {
    setImageError("");
    setOptionGroupError("");

    if (!hasUploadedImages) {
      setImageError(`Please upload at least one ${imageEntityLabel} image.`);
      toast.error("Please upload at least one image");
      return;
    }

    if (isEventForm) {
      if (!data.starting_date || !data.ending_date) {
        toast.error("Event start and end dates are required.");
        return;
      }

      const startingDate = new Date(data.starting_date);
      const endingDate = new Date(data.ending_date);

      if (
        Number.isNaN(startingDate.getTime()) ||
        Number.isNaN(endingDate.getTime()) ||
        endingDate <= startingDate
      ) {
        toast.error("Event end date must be after the start date.");
        return;
      }
    }

    let normalizedOptionGroups: ProductOptionGroup[] = [];

    try {
      normalizedOptionGroups =
        normalizeProductOptionGroupsForSubmit(optionGroups);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Check product option groups before saving.";
      setOptionGroupError(message);
      toast.error(message);
      return;
    }

    try {
      setSubmitting(true);

      const uploadedImages = images.filter(
        (img): img is ProductFormImage => img !== null,
      );
      const payload: SellerProductUpdatePayload = {
        title: data.title,
        slug: data.slug,
        description: data.description,
        tags: data.tags,
        warranty: data.warranty,
        brand: data.brand || "",
        cash_on_delivery: data.cash_on_delivery,
        category: data.category,
        subcategory: data.subcategory,
        detailed_description: data.detailed_description,
        video_url: data.video_url || "",
        regular_price: data.regular_price,
        sale_price: data.sale_price,
        stock: data.stock,
        status: data.status,
        custom_specifications: data.custom_specifications || [],
        discountCodes: data.discountCodes || [],
        colors: getOptionGroupValues(normalizedOptionGroups, "Color"),
        sizes: getOptionGroupValues(normalizedOptionGroups, "Size"),
        custom_properties: {
          optionGroups: normalizedOptionGroups,
        },
        images: uploadedImages.map(({ url, fileId }) => ({ url, fileId })),
      };

      if (isEventForm) {
        payload.isEvent = true;
        payload.starting_date = new Date(data.starting_date).toISOString();
        payload.ending_date = new Date(data.ending_date).toISOString();
      }

      await onSubmit(payload);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to save ${imageEntityLabel}`;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = async (file: File | null, index: number) => {
    if (!file) return;

    const validationError = validateProductImageFile(file);

    if (validationError) {
      setImageError(validationError);
      toast.error(validationError);
      return;
    }

    setImageError("");
    setUploadingIndexes((prev) =>
      prev.includes(index) ? prev : [...prev, index],
    );

    try {
      const res = await uploadImage.mutateAsync(file);
      const uploadedImage: ProductFormImage = {
        fileId: res.fileId,
        url: res.url,
        persisted: false,
      };

      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        updatedImages[index] = uploadedImage;

        if (index === updatedImages.length - 1 && updatedImages.length < 8) {
          updatedImages.push(null);
        }

        return updatedImages;
      });

      toast.success("Image uploaded successfully");
    } catch (error: any) {
      const message = getImageUploadErrorMessage(error);

      setImageError(message);
      toast.error(message);
    } finally {
      setUploadingIndexes((prev) => prev.filter((i) => i !== index));
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index];

    if (!imageToRemove?.fileId) return;

    setRemovingIndexes((prev) =>
      prev.includes(index) ? prev : [...prev, index],
    );

    try {
      if (!imageToRemove.persisted) {
        await deleteImage.mutateAsync(imageToRemove.fileId);
      }

      setImages((prevImages) => {
        const updatedImages = [...prevImages];
        updatedImages.splice(index, 1);

        if (updatedImages.length === 0) {
          updatedImages.push(null);
        }

        if (!updatedImages.includes(null) && updatedImages.length < 8) {
          updatedImages.push(null);
        }

        return updatedImages;
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to remove image";

      toast.error(message);
    } finally {
      setRemovingIndexes((prev) => prev.filter((i) => i !== index));
    }
  };

  return (
    <form
      className="min-h-screen space-y-6 p-4 text-slate-900 sm:p-6 [&_input]:!text-slate-900 [&_label]:!text-slate-700 [&_textarea]:!text-slate-900"
      onSubmit={handleSubmit(submitForm)}
    >
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <span className="text-emerald-700">Dashboard</span>
          <ChevronRight size={16} />
          <Link href={listingHref} className="hover:text-emerald-700">
            {listingLabel}
          </Link>
          <ChevronRight size={16} />
          <span>{currentBreadcrumb}</span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className={sectionClass}>
          <div>
            <h3 className="text-base font-semibold">
              {isEventForm ? "Event media" : "Product media"}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Existing images count as valid. Remove images only when you want
              them removed from the {imageEntityLabel}.
            </p>
            <p className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              JPG, PNG, WEBP up to 5MB.
            </p>
          </div>

          <div className="mt-4">
            <ImagePlaceHolder
              size="765 x 850"
              small={false}
              index={0}
              image={images[0]}
              onImageChange={handleImageChange}
              onRemove={handleRemoveImage}
              isUploading={uploadingIndexes.includes(0)}
              isRemoving={removingIndexes.includes(0)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {images.slice(1).map((img, index) => {
              const actualIndex = index + 1;

              return (
                <ImagePlaceHolder
                  size="765 x 850"
                  key={`${actualIndex}-${img?.fileId || "empty"}`}
                  small={true}
                  index={actualIndex}
                  image={img}
                  onImageChange={handleImageChange}
                  onRemove={handleRemoveImage}
                  isUploading={uploadingIndexes.includes(actualIndex)}
                  isRemoving={removingIndexes.includes(actualIndex)}
                />
              );
            })}
          </div>

          {imageError ? (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {imageError}
            </p>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className={sectionClass}>
            <h3 className="text-base font-semibold">Basic information</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <CusInput
                  label={isEventForm ? "Event Title *" : "Product Title *"}
                  placeholder="Enter the title"
                  className={inputClass}
                  {...register("title", { required: "Title is required" })}
                />
                <FieldError message={errors.title?.message as string} />
              </div>

              <div>
                <CusInput
                  label="Slug *"
                  placeholder="product-slug"
                  className={inputClass}
                  {...register("slug", {
                    required: "Slug is required.",
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message:
                        "Use lowercase letters, numbers, and hyphens only.",
                    },
                    minLength: {
                      value: 3,
                      message: "Slug must be at least 3 characters long.",
                    },
                    maxLength: {
                      value: 50,
                      message: "Slug cannot be longer than 50 characters.",
                    },
                  })}
                />
                <FieldError message={errors.slug?.message as string} />
              </div>

              <div className="lg:col-span-2">
                <CusInput
                  type="textarea"
                  rows={4}
                  label="Short Description * (max 150 words)"
                  placeholder="Enter product description for quick view"
                  className={inputClass}
                  {...register("description", {
                    required: "Description is required",
                    validate: (value) => {
                      const wordCount = getWordCount(value);
                      return (
                        wordCount <= 150 ||
                        `Description cannot exceed 150 words (Current: ${wordCount})`
                      );
                    },
                  })}
                />
                <FieldError message={errors.description?.message as string} />
              </div>

              <div>
                <CusInput
                  label="Brand"
                  placeholder="Apple"
                  className={inputClass}
                  {...register("brand")}
                />
              </div>

              <div>
                <CusInput
                  label="Tags *"
                  placeholder="apple, flagship"
                  className={inputClass}
                  {...register("tags", {
                    required: "Separate related product tags with commas.",
                  })}
                />
                <FieldError message={errors.tags?.message as string} />
              </div>
            </div>
          </section>

          {isEventForm ? (
            <section className={sectionClass}>
              <h3 className="text-base font-semibold">Event schedule</h3>
              <p className="mt-1 text-sm text-slate-400">
                Event products are shown as event listings and need a clear
                start and end time.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Start date *
                  </label>
                  <input
                    type="datetime-local"
                    className={`${inputClass} w-full`}
                    {...register("starting_date", {
                      required: "Start date is required.",
                    })}
                  />
                  <FieldError
                    message={errors.starting_date?.message as string}
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    End date *
                  </label>
                  <input
                    type="datetime-local"
                    className={`${inputClass} w-full`}
                    {...register("ending_date", {
                      required: "End date is required.",
                      validate: (value) => {
                        if (!value || !startingDateValue) return true;

                        return (
                          new Date(value) > new Date(startingDateValue) ||
                          "End date must be after the start date."
                        );
                      },
                    })}
                  />
                  <FieldError message={errors.ending_date?.message as string} />
                </div>
              </div>
            </section>
          ) : null}

          <section className={sectionClass}>
            <h3 className="text-base font-semibold">Category</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Category *
                </label>
                {getCategories.isPending ? (
                  <p className="text-sm text-slate-500">Loading categories</p>
                ) : getCategories.isError ? (
                  <p className="text-sm text-red-600">
                    Failed to load categories
                  </p>
                ) : (
                  <Controller
                    name="category"
                    control={control}
                    rules={{ required: "Category is required" }}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          setValue("subcategory", "");
                        }}
                        className={selectClass}
                      >
                        <option value="" className="bg-white">
                          Select Category
                        </option>
                        {categories?.map((category: string) => (
                          <option
                            value={category}
                            className="bg-white"
                            key={category}
                          >
                            {category}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                )}
                <FieldError message={errors.category?.message as string} />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Subcategory *
                </label>
                <Controller
                  name="subcategory"
                  control={control}
                  rules={{ required: "Subcategory is required" }}
                  render={({ field }) => (
                    <select {...field} className={selectClass}>
                      <option value="" className="bg-white">
                        Select Subcategory
                      </option>
                      {subcategories?.map((subcategory: string) => (
                        <option
                          value={subcategory}
                          className="bg-white"
                          key={subcategory}
                        >
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <FieldError message={errors.subcategory?.message as string} />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-base font-semibold">Pricing and stock</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <CusInput
                  type="number"
                  label="Regular Price *"
                  placeholder="20"
                  className={inputClass}
                  {...register("regular_price", {
                    required: "Regular price is required.",
                    valueAsNumber: true,
                    min: { value: 1, message: "Price must be at least 1" },
                  })}
                />
                <FieldError message={errors.regular_price?.message as string} />
              </div>

              <div>
                <CusInput
                  type="number"
                  label="Sale Price"
                  placeholder="15"
                  className={inputClass}
                  {...register("sale_price", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Sale Price cannot be negative" },
                    validate: (value) => {
                      if (value === undefined || isNaN(value) || value === 0) {
                        return true;
                      }

                      if (
                        typeof regularPrice === "number" &&
                        !isNaN(regularPrice) &&
                        value >= regularPrice
                      ) {
                        return "Sale price must be less than the regular price";
                      }

                      return true;
                    },
                  })}
                />
                <FieldError message={errors.sale_price?.message as string} />
              </div>

              <div>
                <CusInput
                  type="number"
                  label="Stock *"
                  placeholder="100"
                  className={inputClass}
                  {...register("stock", {
                    required: "Stock is required.",
                    valueAsNumber: true,
                    min: { value: 0, message: "Stock cannot be negative" },
                    max: { value: 1000, message: "Stock cannot exceed 1,000" },
                    validate: (value) => {
                      if (isNaN(value)) return "Only numbers are allowed";
                      if (!Number.isInteger(value)) {
                        return "Stock must be a whole number.";
                      }
                      return true;
                    },
                  })}
                />
                <FieldError message={errors.stock?.message as string} />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-base font-semibold">Description</h3>
            <div className="mt-4">
              <label className="mb-1 block font-semibold text-slate-700">
                Detailed description * (min 100 words)
              </label>
              <Controller
                name="detailed_description"
                control={control}
                rules={{
                  required: "Detailed description is required.",
                  validate: (value) => {
                    const wordCount = getRichTextWordCount(value);
                    return (
                      wordCount >= 100 ||
                      `Description must be at least 100 words (Current: ${wordCount})`
                    );
                  },
                }}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {submitCount > 0 ? (
                <FieldError
                  message={errors.detailed_description?.message as string}
                />
              ) : null}
            </div>

            <div className="mt-4">
              <CusInput
                label="Video URL"
                placeholder="https://www.youtube.com/embed/xyz123"
                className={inputClass}
                {...register("video_url", {
                  pattern: {
                    value:
                      /^https:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+$/,
                    message:
                      "Use format: https://www.youtube.com/embed/VIDEO_ID",
                  },
                })}
              />
              <FieldError message={errors.video_url?.message as string} />
            </div>
          </section>

          <ProductOptionGroupsEditor
            value={optionGroups}
            onChange={(nextGroups) => {
              setOptionGroups(nextGroups);
              setOptionGroupError("");
            }}
            error={optionGroupError}
          />

          <section className={sectionClass}>
            <h3 className="text-base font-semibold">
              Extra details and specifications
            </h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <CusInput
                  label="Warranty *"
                  placeholder="1 Year / No Warranty"
                  className={inputClass}
                  {...register("warranty", {
                    required: "Warranty is required.",
                  })}
                />
                <FieldError message={errors.warranty?.message as string} />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  Cash on Delivery *
                </label>
                <select
                  {...register("cash_on_delivery", {
                    required: "Cash on Delivery is required",
                  })}
                  className={selectClass}
                >
                  <option value="yes" className="bg-white">
                    Yes
                  </option>
                  <option value="no" className="bg-white">
                    No
                  </option>
                </select>
                <FieldError
                  message={errors.cash_on_delivery?.message as string}
                />
              </div>

              {mode === "edit" ? (
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    Product status
                  </label>
                  <select {...register("status")} className={selectClass}>
                    <option value="Active" className="bg-white">
                      Active
                    </option>
                    <option value="Pending" className="bg-white">
                      Pending
                    </option>
                    <option value="Draft" className="bg-white">
                      Draft
                    </option>
                  </select>
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <CustomSpecifications control={control} errors={errors} />
            </div>

            <div className="mt-5">
              <label className="mb-2 block font-semibold text-slate-700">
                Select Discount Codes (Optional)
              </label>
              {getDiscountCodes.isPending ? (
                <p className="text-sm text-slate-500">
                  Loading discount codes...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {discountCodes?.map((code: any) => {
                    const isSelected = selectedDiscountCodes.includes(code.id);

                    return (
                      <button
                        key={code.id}
                        type="button"
                        className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                        onClick={() => {
                          const updatedSelection = isSelected
                            ? selectedDiscountCodes.filter(
                                (id: string) => id !== code.id,
                              )
                            : [...selectedDiscountCodes, code.id];
                          setValue("discountCodes", updatedSelection);
                        }}
                      >
                        {code?.public_name} {code?.discountValue}
                        {code?.discountType === "percentage" ? "%" : "$"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={resolvedCancelHref}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting || isUploadingAnyImage}
        >
          {submitting
            ? pendingLabel
            : isUploadingAnyImage
              ? "Uploading image..."
              : submitLabel}
        </button>
      </div>
    </form>
  );
}
