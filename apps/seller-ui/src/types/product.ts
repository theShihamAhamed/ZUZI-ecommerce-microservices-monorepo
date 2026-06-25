export type SellerProductStatus = "Active" | "Pending" | "Draft";

export interface ImageAsset {
  url: string;
  fileId: string;
}

export interface SellerProductOptionGroup {
  id: string;
  name: string;
  values: string[];
  required: boolean;
}

export interface SellerProduct {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory: string;
  short_description: string;
  detailed_description: string;
  images: ImageAsset[];
  thumbnail?: string | null;
  video_url?: string | null;
  tags: string[];
  brand?: string | null;
  colors: string[];
  sizes: string[];
  stock: number;
  sale_price: number;
  regular_price: number;
  event_sale_price?: number | null;
  effective_price?: number;
  active_price_source?: "event" | "normal-sale" | "base";
  event_status?: "none" | "upcoming" | "active" | "ended";
  totalSales: number;
  ratings: number;
  warranty?: string | null;
  cashOnDelivery?: string | null;
  custom_specifications?: unknown;
  custom_properties?: (Record<string, unknown> & {
    optionGroups?: SellerProductOptionGroup[];
  }) | null;
  discount_codes?: string[];
  isEvent?: boolean;
  starting_date?: string | null;
  ending_date?: string | null;
  status: SellerProductStatus;
  isDeleted?: boolean | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerProductsPagination {
  currentPage: number;
  page?: number;
  totalPages: number;
  totalCount: number;
  totalItems?: number;
  total?: number;
  limit: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface SellerProductsFilters {
  categories: string[];
}

export interface SellerProductsQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  status?: string;
  stockState?: string;
  eventState?: "event" | "not-event";
  sort?: string;
}

export interface SellerProductsResponse {
  success: boolean;
  products: SellerProduct[];
  pagination: SellerProductsPagination;
  filters?: SellerProductsFilters;
}

export interface SellerProductResponse {
  success: boolean;
  product: SellerProduct;
}

export type SellerProductUpdatePayload = Partial<{
  title: string;
  slug: string;
  category: string;
  subcategory: string;
  description: string;
  detailed_description: string;
  video_url: string;
  brand: string;
  regular_price: number;
  sale_price: number;
  stock: number;
  tags: string;
  warranty: string;
  cash_on_delivery: "yes" | "no";
  status: SellerProductStatus;
  images: ImageAsset[];
  colors: string[];
  sizes: string[];
  custom_specifications: unknown;
  custom_properties: {
    optionGroups: SellerProductOptionGroup[];
  };
  discountCodes: string[];
  isEvent: boolean;
  starting_date: string;
  ending_date: string;
  event_sale_price: number | null;
}>;
