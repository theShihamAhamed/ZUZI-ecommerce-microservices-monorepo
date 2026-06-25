export type ImageAsset = {
  url: string;
  fileId?: string;
};

export const getImageAssetUrl = (
  asset?: ImageAsset | string | null,
): string | null => {
  if (!asset) return null;
  if (typeof asset === "string") return asset;

  return asset.url || null;
};

export const getProductThumbnail = (product: {
  thumbnail?: string | null;
  images?: ImageAsset[] | null;
}): string | null => product.thumbnail || product.images?.[0]?.url || null;

export const getShopAvatarUrl = (shop?: {
  avatar?: ImageAsset | string | null;
  avatarUrl?: string | null;
} | null): string | null =>
  shop?.avatarUrl || getImageAssetUrl(shop?.avatar) || null;

export const getShopCoverUrl = (shop?: {
  coverBanner?: ImageAsset | string | null;
  coverBannerUrl?: string | null;
} | null): string | null =>
  shop?.coverBannerUrl || getImageAssetUrl(shop?.coverBanner) || null;
