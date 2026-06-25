export type ImageAsset = {
  url: string;
  fileId?: string;
};

export const getImageAssetUrl = (asset?: ImageAsset | null): string | null =>
  asset?.url || null;

export const getProductThumbnail = (product: {
  thumbnail?: string | null;
  images?: ImageAsset[] | null;
}): string | null => product.thumbnail || product.images?.[0]?.url || null;

export const getShopAvatarUrl = (shop?: {
  avatar?: ImageAsset | null;
} | null): string | null => shop?.avatar?.url || null;

export const getShopCoverUrl = (shop?: {
  coverBanner?: ImageAsset | null;
} | null): string | null => shop?.coverBanner?.url || null;
