import Stripe from "stripe";

export type SelectedOptions = Record<string, string> | null;

export interface NormalizedCartItem {
  id: string;
  quantity: number;
  selectedOptions: SelectedOptions;
  selectedOptionsKey: string;
}

export interface TrustedOrderItem {
  productId: string;
  title: string;
  imageUrl: string | null;
  shopId: string;
  sellerId: string;
  sellerStripeId: string | null;
  quantity: number;
  unitAmountCents: number;
  regularAmountCents: number;
  normalSaleAmountCents: number;
  eventSaleAmountCents: number | null;
  activePriceSource: "event" | "normal-sale" | "base";
  eventStatus: "none" | "upcoming" | "active" | "ended";
  subtotalCents: number;
  discountAmountCents: number;
  totalAmountCents: number;
  selectedOptions: SelectedOptions;
}

export interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

export type OrderStatusValue =
  | "Ordered"
  | "Packed"
  | "Paid"
  | "Processing"
  | "Shipped"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export interface StatusHistoryEntry {
  status: OrderStatusValue;
  label: string;
  message: string;
  createdAt: string;
}

export interface ShopOrderGroup {
  shopId: string;
  sellerId: string;
  sellerStripeId: string | null;
  subtotalCents: number;
  discountAmountCents: number;
  totalCents: number;
  items: TrustedOrderItem[];
}

export interface CouponDetails {
  id: string;
  code: string;
  sellerId: string;
  discountType: string;
  discountValue: number;
  eligibleSubtotalCents: number;
  discountAmountCents: number;
}

export interface TrustedCartSummary {
  normalizedCart: NormalizedCartItem[];
  trustedItems: TrustedOrderItem[];
  shopGroups: ShopOrderGroup[];
  coupon: CouponDetails | null;
  subtotalCents: number;
  discountAmountCents: number;
  totalCents: number;
  currency: string;
}

export interface TrustedCheckout extends TrustedCartSummary {
  shippingAddressId: string;
  shippingAddressSnapshot: ShippingAddressSnapshot;
}

export interface PaymentSessionData extends TrustedCheckout {
  sessionId: string;
  userId: string;
  cartHash: string;
  paymentIntentId: string;
  lookupKey: string;
  createdAt: string;
}

export interface CreatedOrderSummary {
  id: string;
  orderNumber: string | null;
  orderGroupId: string;
  shopId: string;
  sellerId: string;
  total: number;
  items: TrustedOrderItem[];
}

export type ReusablePaymentIntentStatus = Stripe.PaymentIntent.Status;
