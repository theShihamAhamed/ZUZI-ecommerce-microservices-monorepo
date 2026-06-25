export type PaymentStatus = "Pending" | "Succeeded" | "Failed" | "Refunded";

export type OrderStatus =
  | "Ordered"
  | "Packed"
  | "Paid"
  | "Processing"
  | "Shipped"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export interface ImageAsset {
  url: string;
  fileId: string;
}

export interface CheckoutItemInput {
  id: string;
  quantity: number;
  selectedOptions?: Record<string, unknown> | null;
}

export interface CreatePaymentSessionInput {
  items: CheckoutItemInput[];
  shippingAddressId: string;
  couponCode?: string;
}

export interface PaymentSummaryItem {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentSummaryShop {
  shopId: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  items: PaymentSummaryItem[];
}

export interface PaymentSummary {
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  shops: PaymentSummaryShop[];
}

export interface CreatePaymentSessionResponse {
  success: boolean;
  sessionId: string;
  clientSecret: string;
  summary: PaymentSummary;
}

export interface VerifyPaymentSessionResponse {
  success: boolean;
  valid: boolean;
  expired?: boolean;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus | null;
  orderCreated?: boolean;
  orderGroupId?: string | null;
  orderIds?: string[];
  summary?: PaymentSummary;
  message?: string;
}

export interface OrderPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OrderShop {
  id: string;
  name: string;
  category?: string;
  ratings?: number;
  avatar?: ImageAsset | null;
  coverBanner?: ImageAsset | null;
  address?: string | null;
}

export interface OrderShippingSummary {
  fullName: string;
  phone: string;
  line: string;
}

export interface OrderShippingAddressSnapshot {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  label: string;
  message: string;
  createdAt: string;
}

export type ReviewRequestStatus = "Pending" | "Used" | "Expired" | "Revoked";

export interface OrderReviewRequest {
  orderItemId?: string;
  publicId: string;
  status: ReviewRequestStatus;
  expiresAt: string;
  usedAt?: string | null;
  reviewId?: string | null;
  canSubmit: boolean;
}

export interface CustomerOrderListItem {
  id: string;
  orderNumber?: string | null;
  orderGroupId?: string | null;
  createdAt: string;
  shop?: OrderShop | null;
  itemCount: number;
  total: number;
  currency: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  shippingSummary?: OrderShippingSummary | null;
  couponCode?: string | null;
  discountAmount: number;
  reviewRequests?: OrderReviewRequest[];
  pendingReviewRequestCount?: number;
  reviewSubmittedCount?: number;
  reviewableItemCount?: number;
}

export interface OrderDetailItem {
  id: string;
  productId: string;
  title: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  selectedOptions?: Record<string, unknown> | null;
  reviewRequest?: OrderReviewRequest;
  hasReview?: boolean;
  reviewSubmitted?: boolean;
}

export interface CustomerOrderDetail {
  id: string;
  orderNumber?: string | null;
  orderGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: OrderShop | null;
  items: OrderDetailItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  couponCode?: string | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
  statusHistory: OrderStatusHistoryEntry[];
}

export interface MyOrdersResponse {
  success: boolean;
  orders: CustomerOrderListItem[];
  pagination: OrderPagination;
}

export interface MyOrderDetailResponse {
  success: boolean;
  order: CustomerOrderDetail;
}
