import prisma from "@libs/prisma";
import { UserEvent, UserEventAction } from "../types/user-event";

const USER_ANALYTICS_ACTIONS = new Set<UserEventAction>([
  "add_to_cart",
  "product_view",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
]);

const PRODUCT_ANALYTICS_ACTIONS = new Set<UserEventAction>([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
  "purchase",
]);

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

type AnalyticsAction = {
  action: string;
  productId?: string | null;
  shopId?: string | null;
  city?: string | null;
  country?: string | null;
  device?: string | null;
  deviceInfo?: string | null;
  createdAt: Date;
};

const isObjectId = (value?: string | null): value is string =>
  typeof value === "string" && OBJECT_ID_PATTERN.test(value);

const toEventDate = (timestamp?: string) => {
  if (!timestamp) return new Date();

  const parsedDate = new Date(timestamp);
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const toUtcDateKey = (date: Date) => date.toISOString().slice(0, 10);

const buildAnalyticsAction = (event: UserEvent): AnalyticsAction => ({
  action: event.action,
  productId: isObjectId(event.productId) ? event.productId : null,
  shopId: isObjectId(event.shopId) ? event.shopId : null,
  city: event.city || null,
  country: event.country || null,
  device: event.device || null,
  deviceInfo: event.deviceInfo || null,
  createdAt: toEventDate(event.timestamp),
});

const removeLatestMatchingWishlistAdd = (
  actions: AnalyticsAction[],
  productId?: string | null,
) => {
  for (let index = actions.length - 1; index >= 0; index -= 1) {
    const action = actions[index];

    if (
      action.action === "add_to_wishlist" &&
      action.productId &&
      action.productId === productId
    ) {
      return actions.filter((_, actionIndex) => actionIndex !== index);
    }
  }

  return actions;
};

export const updateUserAnalytics = async (event: UserEvent) => {
  if (!USER_ANALYTICS_ACTIONS.has(event.action)) return;
  if (!isObjectId(event.userId)) return;

  const userId = event.userId;
  const nextAction = buildAnalyticsAction(event);
  const existingAnalytics = await prisma.userAnalytics.findUnique({
    where: { userId },
  });

  const existingActions = (existingAnalytics?.actions || []) as AnalyticsAction[];
  const shouldRemoveWishlistAdd =
    event.action === "remove_from_wishlist" && isObjectId(event.productId);
  const actionsAfterRemoval = shouldRemoveWishlistAdd
    ? removeLatestMatchingWishlistAdd(existingActions, event.productId)
    : existingActions;
  const foundWishlistAdd =
    shouldRemoveWishlistAdd && actionsAfterRemoval.length !== existingActions.length;
  const nextActions = foundWishlistAdd
    ? actionsAfterRemoval
    : [...actionsAfterRemoval, nextAction];
  const latestActions = nextActions.slice(-100);
  const lastActivityAt = nextAction.createdAt;

  await prisma.userAnalytics.upsert({
    where: { userId },
    update: {
      actions: { set: latestActions },
      city: event.city || null,
      country: event.country || null,
      device: event.device || null,
      deviceInfo: event.deviceInfo || null,
      lastActivityAt,
    },
    create: {
      userId,
      actions: latestActions,
      city: event.city || null,
      country: event.country || null,
      device: event.device || null,
      deviceInfo: event.deviceInfo || null,
      lastActivityAt,
    },
  });
};

export const updateShopAnalytics = async (event: UserEvent) => {
  if (event.action !== "shop_visited") return;
  if (!isObjectId(event.shopId)) {
    console.warn("Skipped shop analytics event: invalid shopId", {
      shopId: event.shopId,
    });
    return;
  }

  const shop = await prisma.shop.findUnique({
    where: {
      id: event.shopId,
    },
    select: {
      id: true,
      sellerId: true,
    },
  });

  if (!shop) {
    console.warn("Skipped shop analytics event: shop not found", {
      shopId: event.shopId,
    });
    return;
  }

  const visitedAt = toEventDate(event.timestamp);
  const dailyDate = toUtcDateKey(visitedAt);
  const isLoggedInVisit = isObjectId(event.userId);
  const visitCounters = {
    totalVisits: {
      increment: 1,
    },
    ...(isLoggedInVisit
      ? {
          loggedInVisits: {
            increment: 1,
          },
        }
      : {
          guestVisits: {
            increment: 1,
          },
        }),
  };

  await Promise.all([
    prisma.shopAnalytics.upsert({
      where: {
        shopId: shop.id,
      },
      update: {
        sellerId: shop.sellerId,
        ...visitCounters,
        lastVisitedAt: visitedAt,
      },
      create: {
        shopId: shop.id,
        sellerId: shop.sellerId,
        totalVisits: 1,
        loggedInVisits: isLoggedInVisit ? 1 : 0,
        guestVisits: isLoggedInVisit ? 0 : 1,
        lastVisitedAt: visitedAt,
      },
    }),
    prisma.shopDailyAnalytics.upsert({
      where: {
        shopId_date: {
          shopId: shop.id,
          date: dailyDate,
        },
      },
      update: {
        sellerId: shop.sellerId,
        ...visitCounters,
      },
      create: {
        shopId: shop.id,
        sellerId: shop.sellerId,
        date: dailyDate,
        totalVisits: 1,
        loggedInVisits: isLoggedInVisit ? 1 : 0,
        guestVisits: isLoggedInVisit ? 0 : 1,
      },
    }),
  ]);
};

const ensureProductAnalytics = async (event: UserEvent) => {
  if (!isObjectId(event.productId)) return;

  const productId = event.productId;
  await prisma.productAnalytics.upsert({
    where: { productId },
    update: {
      shopId: isObjectId(event.shopId) ? event.shopId : undefined,
    },
    create: {
      productId,
      shopId: isObjectId(event.shopId) ? event.shopId : null,
      views: 0,
      cartAdds: 0,
      wishListAdds: 0,
      purchases: 0,
      lastViewedAt: null,
    },
  });
};

export const updateProductAnalytics = async (event: UserEvent) => {
  if (!PRODUCT_ANALYTICS_ACTIONS.has(event.action)) return;
  if (!isObjectId(event.productId)) return;

  const productId = event.productId;
  const now = toEventDate(event.timestamp);

  if (event.action === "remove_from_cart") {
    await ensureProductAnalytics(event);
    await prisma.productAnalytics.updateMany({
      where: {
        productId,
        cartAdds: { gt: 0 },
      },
      data: {
        cartAdds: { decrement: 1 },
      },
    });
    return;
  }

  if (event.action === "remove_from_wishlist") {
    await ensureProductAnalytics(event);
    await prisma.productAnalytics.updateMany({
      where: {
        productId,
        wishListAdds: { gt: 0 },
      },
      data: {
        wishListAdds: { decrement: 1 },
      },
    });
    return;
  }

  await prisma.productAnalytics.upsert({
    where: { productId },
    update: {
      shopId: isObjectId(event.shopId) ? event.shopId : undefined,
      ...(event.action === "product_view" && {
        views: { increment: 1 },
        lastViewedAt: now,
      }),
      ...(event.action === "add_to_cart" && {
        cartAdds: { increment: 1 },
      }),
      ...(event.action === "add_to_wishlist" && {
        wishListAdds: { increment: 1 },
      }),
      ...(event.action === "purchase" && {
        purchases: { increment: 1 },
      }),
    },
    create: {
      productId,
      shopId: isObjectId(event.shopId) ? event.shopId : null,
      views: event.action === "product_view" ? 1 : 0,
      cartAdds: event.action === "add_to_cart" ? 1 : 0,
      wishListAdds: event.action === "add_to_wishlist" ? 1 : 0,
      purchases: event.action === "purchase" ? 1 : 0,
      lastViewedAt: event.action === "product_view" ? now : null,
    },
  });
};
