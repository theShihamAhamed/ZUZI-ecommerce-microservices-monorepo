import { CartItem, Product } from "@/types/product";

export type DisplayPriceSource = "event" | "normal-sale" | "base";
export type DisplayEventStatus = "none" | "upcoming" | "active" | "ended";

export interface DisplayProductPricing {
  regularPrice: number | null;
  normalSalePrice: number | null;
  eventSalePrice: number | null;
  displayPrice: number | null;
  compareAtPrice: number | null;
  activePriceSource: DisplayPriceSource;
  eventStatus: DisplayEventStatus;
  isEventPriceActive: boolean;
}

const getSafeNumber = (value: number | null | undefined) => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const getPositiveNumber = (value: number | null | undefined) => {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
};

const parseDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFallbackEventStatus = (
  product: Pick<
    Product,
    "isEvent" | "event_status" | "starting_date" | "ending_date"
  >,
): DisplayEventStatus => {
  if (
    product.event_status === "none" ||
    product.event_status === "upcoming" ||
    product.event_status === "active" ||
    product.event_status === "ended"
  ) {
    return product.event_status;
  }

  if (!product.isEvent) return "none";

  const startDate = parseDate(product.starting_date);
  const endDate = parseDate(product.ending_date);
  const now = Date.now();

  if (startDate && startDate.getTime() > now) return "upcoming";
  if (endDate && endDate.getTime() < now) return "ended";

  return "active";
};

export const getDisplayProductPricing = (
  product: Pick<
    Product,
    | "regular_price"
    | "sale_price"
    | "event_sale_price"
    | "effective_price"
    | "active_price_source"
    | "event_status"
    | "isEvent"
    | "starting_date"
    | "ending_date"
  >,
): DisplayProductPricing => {
  const regularPrice = getPositiveNumber(product.regular_price);
  const normalSalePrice =
    getPositiveNumber(product.sale_price) || regularPrice;
  const backendEffectivePrice = getPositiveNumber(product.effective_price);
  const eventStatus = getFallbackEventStatus(product);
  const eventSalePrice = getPositiveNumber(product.event_sale_price);
  const isEventPriceActive =
    product.active_price_source === "event" && eventStatus === "active";
  const displayPrice =
    backendEffectivePrice || normalSalePrice || regularPrice;
  const activePriceSource: DisplayPriceSource =
    isEventPriceActive && displayPrice
      ? "event"
      : normalSalePrice
        ? "normal-sale"
        : "base";
  const normalComparePrice =
    regularPrice && displayPrice && regularPrice > displayPrice
      ? regularPrice
      : null;
  const eventComparePrice =
    isEventPriceActive &&
    normalSalePrice &&
    displayPrice &&
    normalSalePrice > displayPrice
      ? normalSalePrice
      : null;

  return {
    regularPrice,
    normalSalePrice,
    eventSalePrice,
    displayPrice,
    compareAtPrice: eventComparePrice || normalComparePrice,
    activePriceSource,
    eventStatus,
    isEventPriceActive: Boolean(isEventPriceActive && displayPrice),
  };
};

export const formatPrice = (price: number | null | undefined) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(getSafeNumber(price));
};

export const getSavedAmount = (regularPrice: number, salePrice: number) => {
  const savedAmount = getSafeNumber(regularPrice) - getSafeNumber(salePrice);
  return savedAmount > 0 ? savedAmount : 0;
};

export const getCartSubtotal = (cart: CartItem[]) => {
  return cart.reduce((total, item) => {
    const quantity = item.quantity || 1;
    const pricing = getDisplayProductPricing(item);
    return total + getSafeNumber(pricing.displayPrice) * quantity;
  }, 0);
};
