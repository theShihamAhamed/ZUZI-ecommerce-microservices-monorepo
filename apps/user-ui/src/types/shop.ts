import {
  EventProductStatus,
  Product,
  ProductPagination,
  ProductSort,
} from "@/types/product";

export interface ImageAsset {
  url: string;
  fileId: string;
}

export interface Shop {
  id: string;
  name: string;
  bio?: string | null;
  category?: string | null;
  ratings?: number | null;
  reviewCount?: number;
  avatar?: ImageAsset | null;
  avatarUrl?: string | null;
  coverBanner?: ImageAsset | null;
  coverBannerUrl?: string | null;
  address?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  createdAt?: string;
  productCount?: number;
}

export interface ShopsResponse {
  success: boolean;
  shops: Shop[];
  pagination: ProductPagination;
}

export interface ShopDetailResponse {
  success: boolean;
  shop: Shop;
}

export interface ShopProductsResponse {
  success: boolean;
  products: Product[];
  pagination: ProductPagination;
}

export interface ShopFilters {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
}

export interface ShopProductsParams {
  page?: number;
  limit?: number;
  sort?: ProductSort;
}

export interface ShopEventsParams extends ShopProductsParams {
  status?: EventProductStatus;
}
