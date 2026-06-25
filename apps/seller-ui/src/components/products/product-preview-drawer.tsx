"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SellerProduct, SellerProductOptionGroup } from "@/types/product";
import { getProductThumbnail } from "@/utils/image-assets";

interface ProductPreviewDrawerProps {
  product: SellerProduct | null;
  onClose: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? price : 0);

const formatDate = (date?: string) => {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const getOptionGroups = (product: SellerProduct) => {
  const groups: SellerProductOptionGroup[] = [];
  const seenNames = new Set<string>();
  const customGroups = product.custom_properties?.optionGroups;

  if (Array.isArray(customGroups)) {
    customGroups.forEach((group) => {
      if (!group.name || !Array.isArray(group.values) || group.values.length === 0) {
        return;
      }

      const key = group.name.toLowerCase();
      if (seenNames.has(key)) return;

      seenNames.add(key);
      groups.push(group);
    });
  }

  if (!seenNames.has("color") && product.colors?.length > 0) {
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

const getSpecifications = (product: SellerProduct) => {
  const specs = product.custom_specifications;

  if (Array.isArray(specs)) {
    return specs.flatMap((spec) => {
      if (!spec || typeof spec !== "object" || Array.isArray(spec)) return [];

      const entry = spec as Record<string, unknown>;
      const name = String(entry.name || "").trim();
      const value = String(entry.value || "").trim();

      return name || value ? [{ name, value }] : [];
    });
  }

  if (specs && typeof specs === "object") {
    return Object.entries(specs as Record<string, unknown>).map(
      ([name, value]) => ({
        name,
        value: String(value ?? ""),
      }),
    );
  }

  return [];
};

export function ProductPreviewDrawer({
  product,
  onClose,
}: ProductPreviewDrawerProps) {
  const [renderedProduct, setRenderedProduct] = useState(product);
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const requestClose = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    if (product) {
      setRenderedProduct(product);
      const frame = window.requestAnimationFrame(() => {
        setIsOpen(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    setIsOpen(false);
    const timeout = window.setTimeout(() => {
      setRenderedProduct(null);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [product]);

  useEffect(() => {
    if (!renderedProduct) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [renderedProduct, requestClose]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!renderedProduct) return null;

  const images = renderedProduct.images || [];
  const thumbnail = getProductThumbnail(renderedProduct);
  const optionGroups = getOptionGroups(renderedProduct);
  const specifications = getSpecifications(renderedProduct);
  const drawerTitleId = `product-preview-title-${renderedProduct.id}`;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={drawerTitleId}
    >
      <button
        type="button"
        aria-label="Close product preview"
        className={`pointer-events-auto absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          isOpen ? "opacity-100 ease-out" : "opacity-0 ease-in"
        }`}
        onClick={requestClose}
      />
      <aside
        className={`pointer-events-auto fixed inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-slate-200 bg-white text-slate-900 shadow-2xl transition-transform duration-300 sm:max-w-[420px] md:max-w-[520px] xl:max-w-[560px] ${
          isOpen ? "translate-x-0 ease-out" : "translate-x-full ease-in"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Product preview
            </p>
            <h2 id={drawerTitleId} className="truncate text-lg font-semibold text-slate-950">
              {renderedProduct.title}
            </h2>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={requestClose}
            aria-label="Close preview"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={renderedProduct.title}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-500">
                No product image
              </div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(0, 5).map((image) => (
                <div
                  key={image.fileId}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={image.url}
                    alt={renderedProduct.title}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {renderedProduct.status}
              </span>
              {renderedProduct.stock <= 0 ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                  Out of stock
                </span>
              ) : null}
            </div>
            <h3 className="mt-4 break-words text-2xl font-semibold">
              {renderedProduct.title}
            </h3>
            <p className="mt-2 break-all text-sm text-slate-500">
              {renderedProduct.slug}
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {renderedProduct.short_description}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Category
              </p>
              <p className="mt-2 text-sm font-semibold">
                {renderedProduct.category} / {renderedProduct.subCategory}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Stock
              </p>
              <p className="mt-2 text-sm font-semibold">{renderedProduct.stock}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Regular price
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatPrice(renderedProduct.regular_price)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Sale price
              </p>
              <p className="mt-2 text-sm font-semibold">
                {formatPrice(renderedProduct.sale_price)}
              </p>
            </div>
          </section>

          {optionGroups.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-semibold">Options</h3>
              <div className="mt-3 space-y-3">
                {optionGroups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {group.name}
                      </p>
                      <span className="text-xs text-slate-500">
                        {group.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.values.map((value) => (
                        <span
                          key={value}
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {specifications.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-semibold">Specifications</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {specifications.map((spec) => (
                  <div
                    key={`${spec.name}-${spec.value}`}
                    className="flex justify-between gap-4 py-2 text-sm"
                  >
                    <span className="text-slate-500">{spec.name}</span>
                    <span className="text-right font-semibold text-slate-900">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Created
                </p>
                <p className="mt-1 font-semibold">
                  {formatDate(renderedProduct.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Updated
                </p>
                <p className="mt-1 font-semibold">
                  {formatDate(renderedProduct.updatedAt)}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/dashboard/products/${renderedProduct.id}/edit`}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              Edit product
            </Link>
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
