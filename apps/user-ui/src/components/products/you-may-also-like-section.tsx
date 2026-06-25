"use client";

import { ProductCard } from "@/components/products/product-card";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { Product } from "@/types/product";

interface YouMayAlsoLikeSectionProps {
  currentProduct: Product;
  products: Product[];
}

export function YouMayAlsoLikeSection({
  currentProduct,
  products,
}: YouMayAlsoLikeSectionProps) {
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();
  const relatedProducts = products
    .filter(
      (product) =>
        product.id !== currentProduct.id && product.slug !== currentProduct.slug,
    )
    .slice(0, 12);

  return (
    <section className="min-w-0 max-w-full py-2">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-700">
            More from the marketplace
          </p>
          <h2 className="mt-1 break-words text-lg font-bold text-gray-900">
            You may also like
          </h2>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <div className="mt-6 grid min-w-0 max-w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
          {relatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              user={fetchUser.data}
              location={location}
              deviceInfo={deviceInfo}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 min-w-0 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <h3 className="text-sm font-semibold text-gray-900">
            No related products available yet.
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Similar marketplace finds will appear here as sellers add more
            products.
          </p>
        </div>
      )}
    </section>
  );
}
