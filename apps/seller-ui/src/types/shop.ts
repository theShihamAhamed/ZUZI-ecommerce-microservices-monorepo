export interface ImageAsset {
  url: string;
  fileId: string;
}

export interface SellerShop {
  id: string;
  name: string;
  bio?: string | null;
  category: string;
  avatar?: ImageAsset | null;
  avatarUrl?: string | null;
  coverBanner?: ImageAsset | null;
  coverBannerUrl?: string | null;
  address: string;
  opening_hours?: string | null;
  website?: string | null;
  ratings?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SellerShopResponse {
  success: boolean;
  shop: SellerShop;
}

export interface SellerShopUpdatePayload {
  name: string;
  bio?: string | null;
  category: string;
  address: string;
  website?: string | null;
  opening_hours?: string | null;
  avatar?: ImageAsset | null;
  coverBanner?: ImageAsset | null;
}

export interface ShopImageUploadResponse {
  success: boolean;
  url: string;
  fileId: string;
}
