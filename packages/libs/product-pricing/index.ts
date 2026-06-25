export type EventStatus = "none" | "upcoming" | "active" | "ended";
export type ActivePriceSource = "event" | "normal-sale" | "base";

export type ProductPricingInput = {
  regular_price?: number | null;
  sale_price?: number | null;
  event_sale_price?: number | null;
  isEvent?: boolean | null;
  starting_date?: Date | string | null;
  ending_date?: Date | string | null;
};

export type ProductEffectivePricing = {
  basePrice: number;
  normalSalePrice: number;
  eventSalePrice: number | null;
  effectivePrice: number;
  activePriceSource: ActivePriceSource;
  eventStatus: EventStatus;
};

const isFinitePositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const parseDate = (value?: Date | string | null) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getNormalBuyingPrice = (product: ProductPricingInput) => {
  if (isFinitePositiveNumber(product.sale_price)) {
    return {
      price: product.sale_price,
      source: "normal-sale" as const,
    };
  }

  return {
    price: isFinitePositiveNumber(product.regular_price)
      ? product.regular_price
      : 0,
    source: "base" as const,
  };
};

export const getProductEventStatus = (
  product: Pick<
    ProductPricingInput,
    "isEvent" | "starting_date" | "ending_date"
  >,
  now = new Date(),
): EventStatus => {
  if (product.isEvent !== true) {
    return "none";
  }

  const startDate = parseDate(product.starting_date);
  const endDate = parseDate(product.ending_date);
  const nowTime = now.getTime();

  if (startDate && startDate.getTime() > nowTime) {
    return "upcoming";
  }

  if (endDate && endDate.getTime() < nowTime) {
    return "ended";
  }

  return "active";
};

export const getProductEffectivePricing = (
  product: ProductPricingInput,
  now = new Date(),
): ProductEffectivePricing => {
  const eventStatus = getProductEventStatus(product, now);
  const basePrice = isFinitePositiveNumber(product.regular_price)
    ? product.regular_price
    : 0;
  const normalSale = getNormalBuyingPrice(product);
  const eventSalePrice = isFinitePositiveNumber(product.event_sale_price)
    ? product.event_sale_price
    : null;
  const hasActiveEventPrice =
    eventStatus === "active" &&
    eventSalePrice !== null &&
    eventSalePrice < normalSale.price;

  return {
    basePrice,
    normalSalePrice: normalSale.price,
    eventSalePrice,
    effectivePrice: hasActiveEventPrice ? eventSalePrice : normalSale.price,
    activePriceSource: hasActiveEventPrice ? "event" : normalSale.source,
    eventStatus,
  };
};

export const validateEventSalePrice = (
  value: unknown,
  normalSalePrice: number,
) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Event special price must be a valid number");
  }

  if (parsed <= 0) {
    throw new Error("Event special price must be greater than zero");
  }

  if (!isFinitePositiveNumber(normalSalePrice)) {
    throw new Error("Normal sale price must be valid before setting event price");
  }

  if (parsed >= normalSalePrice) {
    throw new Error("Event special price must be lower than normal sale price");
  }

  return parsed;
};
