import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ShopDetailView } from "@/components/shops/shop-detail-view";
import { ShopVisitTracker } from "@/components/shops/shop-visit-tracker";
import { getShopDetailApi } from "@/services/product.api";
import { Shop } from "@/types/shop";
import { getShopCoverUrl } from "@/utils/image-assets";

interface ShopPageProps {
  params: Promise<{
    shopId: string;
  }>;
}

const getSiteUrl = () => {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  return siteUrl?.replace(/\/$/, "");
};

const getShop = cache(async (shopId: string) => {
  const response = await getShopDetailApi(shopId);
  return response?.shop || null;
});

const getShopImage = (shop: Shop) => getShopCoverUrl(shop) || undefined;

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { shopId } = await params;
  const siteUrl = getSiteUrl();

  try {
    const shop = await getShop(shopId);

    if (!shop) {
      return {
        title: "Shop not found | Zuzi",
        description: "This shop is no longer available on Zuzi.",
      };
    }

    const shopPath = `/shops/${shop.id}`;
    const description =
      shop.bio || `Explore products and offers from ${shop.name} on Zuzi.`;
    const image = getShopImage(shop);

    return {
      title: `${shop.name} | Zuzi`,
      description,
      alternates: siteUrl
        ? {
            canonical: `${siteUrl}${shopPath}`,
          }
        : undefined,
      openGraph: {
        title: shop.name,
        description,
        url: siteUrl ? `${siteUrl}${shopPath}` : undefined,
        type: "website",
        images: image
          ? [
              {
                url: image,
                alt: `${shop.name} cover`,
              },
            ]
          : undefined,
      },
    };
  } catch {
    return {
      title: "Zuzi shop",
      description: "Explore marketplace shops on Zuzi.",
    };
  }
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { shopId } = await params;
  const shop = await getShop(shopId);

  if (!shop) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shops", href: "/shops" },
            { label: shop.name },
          ]}
        />
      </div>

      <ShopVisitTracker shopId={shop.id} />
      <ShopDetailView shop={shop} />
    </main>
  );
}
