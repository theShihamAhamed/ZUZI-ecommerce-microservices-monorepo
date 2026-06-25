export const USER_EVENT_ACTIONS = [
  "shop_visited",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "purchase",
] as const;

export type UserEventAction = (typeof USER_EVENT_ACTIONS)[number];

export type UserEvent = {
  userId?: string | null;
  productId?: string | null;
  shopId?: string | null;
  action: UserEventAction;
  device?: string | null;
  deviceInfo?: string | null;
  country?: string | null;
  city?: string | null;
  timestamp?: string;
};

export const isUserEventAction = (
  action: unknown,
): action is UserEventAction =>
  typeof action === "string" &&
  USER_EVENT_ACTIONS.includes(action as UserEventAction);
