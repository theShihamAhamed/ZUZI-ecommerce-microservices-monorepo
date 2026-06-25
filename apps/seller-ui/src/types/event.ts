import {
  SellerProduct,
  SellerProductsPagination,
} from "@/types/product";

export type SellerEvent = SellerProduct;

export type SellerEventStatusFilter =
  | "all"
  | "upcoming"
  | "active"
  | "ended";

export type SellerEventSort = "newest" | "start-date" | "ending-soon";

export interface SellerEventsQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: SellerEventStatusFilter;
  sort?: SellerEventSort;
}

export interface SellerEventStats {
  total: number;
  active: number;
  upcoming: number;
  ended: number;
}

export interface SellerEventsResponse {
  success: boolean;
  events: SellerEvent[];
  products?: SellerEvent[];
  pagination: SellerProductsPagination;
  stats: SellerEventStats;
}

export interface SellerEventResponse {
  success: boolean;
  event: SellerEvent;
  product?: SellerEvent;
}

export interface CreateSellerEventPayload {
  productId: string;
  starting_date: string;
  ending_date: string;
  event_sale_price?: number | null;
}

export interface UpdateSellerEventPayload {
  starting_date: string;
  ending_date: string;
  event_sale_price?: number | null;
}
