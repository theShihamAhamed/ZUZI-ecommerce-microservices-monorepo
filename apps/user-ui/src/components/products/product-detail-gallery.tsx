"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { ProductImage } from "@/types/product";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

interface ProductDetailGalleryProps {
  images?: ProductImage[];
  title: string;
}

export function ProductDetailGallery({
  images = [],
  title,
}: ProductDetailGalleryProps) {
  const galleryImages = useMemo(
    () =>
      images.length > 0
        ? images
        : [{ url: PRODUCT_PLACEHOLDER_IMAGE, fileId: "placeholder" }],
    [images],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const selectedImage =
    galleryImages[selectedIndex]?.url || PRODUCT_PLACEHOLDER_IMAGE;

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setZoomPosition({
      x: Math.min(Math.max(x, 0), 100),
      y: Math.min(Math.max(y, 0), 100),
    });
  };

  return (
    <section className="min-w-0 max-w-full" aria-label={`${title} images`}>
      <div
        className="relative max-w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={selectedImage}
          alt={title}
          className="aspect-square w-full object-cover"
        />

        <div
          className={`pointer-events-none absolute inset-0 hidden bg-white bg-no-repeat transition-opacity duration-150 md:block ${
            isZooming ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${selectedImage})`,
            backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
            backgroundSize: "200%",
          }}
          aria-hidden="true"
        />
      </div>

      {galleryImages.length > 1 ? (
        <div className="mt-4 grid min-w-0 max-w-full grid-cols-4 gap-3 sm:grid-cols-5">
          {galleryImages.map((image, index) => {
            const imageUrl = image.url || PRODUCT_PLACEHOLDER_IMAGE;
            const isSelected = index === selectedIndex;

            return (
              <button
                type="button"
                key={image.fileId || imageUrl}
                onClick={() => setSelectedIndex(index)}
                className={`min-w-0 overflow-hidden rounded-xl border bg-white transition ${
                  isSelected
                    ? "border-amber-400 ring-2 ring-amber-200"
                    : "border-stone-200 hover:border-amber-300"
                }`}
                aria-label={`Show image ${index + 1} for ${title}`}
              >
                <img
                  src={imageUrl}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
