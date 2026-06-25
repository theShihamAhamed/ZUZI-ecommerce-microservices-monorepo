export type SellerOrderStatus =
  | "Ordered"
  | "Packed"
  | "Paid"
  | "Processing"
  | "Shipped"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export type SellerPaymentStatus = "Pending" | "Succeeded" | "Failed" | "Refunded";

export interface ImageAsset {
  url: string;
  fileId: string;
}

export interface SellerOrderPagination {
  total: number;
  totalCount?: number;
  totalItems?: number;
  currentPage?: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SellerOrdersQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

export interface SellerOrderShop {
  id: string;
  name: string;
  category?: string;
  ratings?: number;
  avatar?: ImageAsset | null;
  coverBanner?: ImageAsset | null;
  address?: string | null;
}

export interface SellerOrderShippingSummary {
  fullName: string;
  phone: string;
  line: string;
}

export interface SellerOrderShippingAddressSnapshot {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface SellerOrderListItem {
  id: string;
  orderNumber?: string | null;
  orderGroupId?: string | null;
  createdAt: string;
  shop?: SellerOrderShop | null;
  itemCount: number;
  total: number;
  currency: string;
  paymentStatus: SellerPaymentStatus;
  status: SellerOrderStatus;
  shippingSummary?: SellerOrderShippingSummary | null;
  couponCode?: string | null;
  discountAmount: number;
}

export interface SellerOrderDetailItem {
  id: string;
  productId: string;
  title: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  selectedOptions?: Record<string, unknown> | null;
}

export interface SellerOrderStatusHistoryEntry {
  status: SellerOrderStatus;
  label: string;
  message: string;
  createdAt: string;
}

export interface SellerOrderDetail {
  id: string;
  orderNumber?: string | null;
  orderGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: SellerOrderShop | null;
  items: SellerOrderDetailItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  couponCode?: string | null;
  paymentStatus: SellerPaymentStatus;
  status: SellerOrderStatus;
  shippingAddressSnapshot?: SellerOrderShippingAddressSnapshot | null;
  statusHistory: SellerOrderStatusHistoryEntry[];
}

export interface SellerOrdersResponse {
  success: boolean;
  orders: SellerOrderListItem[];
  pagination: SellerOrderPagination;
}

export interface SellerOrderDetailResponse {
  success: boolean;
  order: SellerOrderDetail;
  allowedNextStatuses: SellerOrderStatus[];
}
