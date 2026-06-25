import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDescriptionSection } from "@/components/products/product-description-section";
import { ProductDetailView } from "@/components/products/product-detail-view";
import { ProductReviewsSection } from "@/components/products/product-reviews-section";
import { YouMayAlsoLikeSection } from "@/components/products/you-may-also-like-section";
import {
  getProductDetailApi,
  getRelatedProductsApi,
} from "@/services/product.api";
import { Product } from "@/types/product";
import { getProductThumbnail } from "@/utils/image-assets";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const getSiteUrl = () => {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  return siteUrl?.replace(/\/$/, "");
};

const getProduct = cache(async (slug: string) => {
  const response = await getProductDetailApi(slug);
  return response?.product || null;
});

const getRelatedProducts = cache(async (product: Product) => {
  try {
    const response = await getRelatedProductsApi({
      category: product.category,
      subCategory: product.subCategory,
      excludeSlug: product.slug,
      excludeProductId: product.id,
      limit: 12,
    });

    return response.products.filter(
      (relatedProduct) =>
        relatedProduct.id !== product.id &&
        relatedProduct.slug !== product.slug,
    );
  } catch {
    return [];
  }
});

const getProductImage = (product: Product, siteUrl?: string) => {
  const imageUrl = getProductThumbnail(product);

  if (imageUrl) {
    return imageUrl;
  }

  return siteUrl ? `${siteUrl}/images/product-placeholder.png` : undefined;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = getSiteUrl();

  try {
    const product = await getProduct(slug);

    if (!product) {
      return {
        title: "Product not found | Zuzi",
        description: "This product is no longer available on Zuzi.",
      };
    }

    const description =
      product.short_description || "Explore this marketplace product on Zuzi.";
    const image = getProductImage(product, siteUrl);
    const productPath = `/product/${product.slug}`;

    return {
      title: `${product.title} | Zuzi`,
      description,
      alternates: siteUrl
        ? {
            canonical: `${siteUrl}${productPath}`,
          }
        : undefined,
      openGraph: {
        title: product.title,
        description,
        url: siteUrl ? `${siteUrl}${productPath}` : undefined,
        type: "website",
        images: image
          ? [
              {
                url: image,
                alt: product.title,
              },
            ]
          : undefined,
      },
    };
  } catch {
    return {
      title: "Zuzi product",
      description: "Explore marketplace products on Zuzi.",
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product);

  return (
    <main className="min-h-screen bg-stone-50">
      <ProductDetailView product={product} />

      <section className="bg-stone-50 pb-12 sm:pb-16">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-6 px-4 sm:px-6 lg:px-8">
          <ProductDescriptionSection
            description={product.detailed_description}
            customSpecifications={product.custom_specifications}
          />
          <ProductReviewsSection productId={product.id} />
          <YouMayAlsoLikeSection
            currentProduct={product}
            products={relatedProducts}
          />
        </div>
      </section>
    </main>
  );
}
