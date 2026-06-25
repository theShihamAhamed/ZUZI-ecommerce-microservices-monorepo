import { Product } from "@/types/product";

export type AnalyticsEventAction =
  | "shop_visited"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "add_to_wishlist"
  | "remove_from_wishlist"
  | "purchase";

export type AnalyticsLocation =
  | string
  | {
      country?: string | null;
      city?: string | null;
      label?: string | null;
    }
  | null
  | undefined;

export type AnalyticsDevice =
  | string
  | {
      deviceType?: string | null;
      label?: string | null;
    }
  | null
  | undefined;

type BuildProductAnalyticsEventParams = {
  product: Pick<Product, "id" | "shop" | "shopId">;
  user?: { id?: string | null } | null;
  userId?: string | null;
  location?: AnalyticsLocation;
  deviceInfo?: AnalyticsDevice;
  action: AnalyticsEventAction;
};

type BuildShopAnalyticsEventParams = {
  shopId: string;
  user?: { id?: string | null } | null;
  userId?: string | null;
  location?: AnalyticsLocation;
  deviceInfo?: AnalyticsDevice;
};

export const getAnalyticsLocationLabel = (location?: AnalyticsLocation) => {
  if (!location) return "Unknown location";
  if (typeof location === "string") return location || "Unknown location";
  if (location.label) return location.label;
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  }
  return location.city || location.country || "Unknown location";
};

export const getAnalyticsDeviceLabel = (deviceInfo?: AnalyticsDevice) => {
  if (!deviceInfo) return "Unknown device";
  if (typeof deviceInfo === "string") return deviceInfo || "Unknown device";
  return deviceInfo.label || deviceInfo.deviceType || "Unknown device";
};

export const buildProductAnalyticsEvent = ({
  product,
  user,
  userId,
  location,
  deviceInfo,
  action,
}: BuildProductAnalyticsEventParams) => ({
  userId: user?.id || userId || null,
  productId: product.id,
  shopId: product.shop?.id || product.shopId || null,
  action,
  country: typeof location === "object" ? location?.country || null : null,
  city: typeof location === "object" ? location?.city || null : null,
  device:
    typeof deviceInfo === "object" ? deviceInfo?.deviceType || null : null,
  deviceInfo: getAnalyticsDeviceLabel(deviceInfo),
  timestamp: new Date().toISOString(),
});

export const buildShopAnalyticsEvent = ({
  shopId,
  user,
  userId,
  location,
  deviceInfo,
}: BuildShopAnalyticsEventParams) => ({
  userId: user?.id || userId || null,
  productId: null,
  shopId,
  action: "shop_visited" as const,
  country: typeof location === "object" ? location?.country || null : null,
  city: typeof location === "object" ? location?.city || null : null,
  device:
    typeof deviceInfo === "object" ? deviceInfo?.deviceType || null : null,
  deviceInfo: getAnalyticsDeviceLabel(deviceInfo),
  timestamp: new Date().toISOString(),
});
