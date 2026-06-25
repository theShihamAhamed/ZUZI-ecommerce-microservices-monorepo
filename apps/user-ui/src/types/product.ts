export interface ProductImage {
  url: string;
  fileId: string;
}

export interface ImageAsset {
  url: string;
  fileId: string;
}

export interface ProductShop {
  id: string;
  name: string;
  category?: string;
  ratings?: number;
  avatar?: ImageAsset | null;
  avatarUrl?: string | null;
  coverBanner?: ImageAsset | null;
  coverBannerUrl?: string | null;
  address?: string | null;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  values: string[];
  required: boolean;
}

export type SelectedProductOptions = Record<string, string>;

export interface Product {
  id: string;
  title: string;
  slug: string;
  category?: string;
  subCategory?: string;
  short_description: string;
  detailed_description?: string;
  images: ProductImage[];
  thumbnail?: string | null;
  video_url?: string | null;
  tags?: string[];
  shop?: ProductShop | null;
  shopId?: string;
  ratings: number;
  totalSales: number;
  sale_price: number;
  regular_price: number;
  event_sale_price?: number | null;
  effective_price?: number | null;
  active_price_source?: "event" | "normal-sale" | "base" | null;
  event_status?: "none" | "upcoming" | "active" | "ended" | null;
  reviewCount?: number;
  starting_date?: string | null;
  ending_date?: string | null;
  isEvent?: boolean;
  stock: number;
  colors: string[];
  sizes: string[];
  brand?: string | null;
  warranty?: string | null;
  cashOnDelivery?: string | null;
  custom_specifications?: Record<string, unknown> | null;
  custom_properties?: (Record<string, unknown> & {
    optionGroups?: ProductOptionGroup[];
  }) | null;
}

export interface ProductDetailResponse {
  success: boolean;
  product: Product;
}

export interface ProductPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type ProductSort = "latest" | "popular" | "price_low" | "price_high";

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  color?: string;
  size?: string;
  sort?: ProductSort;
  excludeSlug?: string;
  excludeProductId?: string;
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: ProductPagination;
  top10Products?: Product[];
}

export interface SearchProductsParams {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  sort?: ProductSort;
}

export interface SearchProductsResponse extends ProductsResponse {
  query: string;
}

export type EventProductStatus =
  | "all"
  | "active"
  | "upcoming"
  | "ended"
  | "expired";

export interface EventProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  subCategory?: string;
  status?: EventProductStatus;
}

export type EventProductsResponse = ProductsResponse;

export interface TopShop {
  id: string;
  name: string;
  category?: string | null;
  ratings?: number | null;
  avatar?: ImageAsset | null;
  avatarUrl?: string | null;
  coverBanner?: ImageAsset | null;
  coverBannerUrl?: string | null;
  address?: string | null;
  createdAt?: string;
  salesScore: number;
  productCount: number;
}

export interface TopShopsResponse {
  success: boolean;
  shops: TopShop[];
}

export interface TopShopsParams {
  limit?: number;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
  location: string;
  deviceInfo: string;
  userId?: string;
  addedAt: string;
  selectedOptions?: SelectedProductOptions | null;
  selectedOptionsKey?: string;
}

export interface WishlistItem extends Product {
  quantity: number;
  location?: string;
  deviceInfo?: string;
  userId?: string;
  addedAt: string;
  selectedOptions?: SelectedProductOptions | null;
  selectedOptionsKey?: string;
}
