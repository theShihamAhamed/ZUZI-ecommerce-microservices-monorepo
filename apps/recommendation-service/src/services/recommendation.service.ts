import prisma from "@libs/prisma";
import { getProductEffectivePricing } from "@packages/libs/product-pricing";
import {
  isSupportedRecommendationAction,
  MINIMUM_TRAINING_ACTIONS,
  WEIGHTED_BASELINE_FALLBACK_ALGORITHM,
} from "../utils/recommendation-constants";
import { RecommendationUser } from "../utils/recommendation-auth";
import {
  getRecommendationTrainingRuntimeStatus,
  triggerRecommendationTrainingInBackground,
} from "./recommendation-background-training.service";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const ACTION_REFRESH_THRESHOLD = 20;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

type RecommendationPagination = {
  page: number;
  limit: number;
  skip: number;
};

type RecommendationSource =
  | "personalized"
  | "cached"
  | "fallback"
  | "training_fallback";

type TrainingStatus =
  | "not_needed"
  | "queued"
  | "running"
  | "fresh"
  | "failed"
  | "stale"
  | "missing_cache";

type RawAnalyticsAction = {
  action?: unknown;
  productId?: unknown;
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const getRecommendationPagination = (query: {
  page?: unknown;
  limit?: unknown;
}) => {
  const page = toPositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(toPositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && OBJECT_ID_PATTERN.test(value);

const countSupportedProductActions = (actions: RawAnalyticsAction[]) =>
  actions.filter(
    (action) =>
      isSupportedRecommendationAction(action.action) && isObjectId(action.productId),
  ).length;

const withEffectivePricingMetadata = <T extends {
  regular_price?: number | null;
  sale_price?: number | null;
  event_sale_price?: number | null;
  isEvent?: boolean | null;
  starting_date?: Date | string | null;
  ending_date?: Date | string | null;
}>(product: T) => {
  const pricing = getProductEffectivePricing(product);

  return {
    ...product,
    event_sale_price: pricing.eventSalePrice,
    effective_price: pricing.effectivePrice,
    active_price_source: pricing.activePriceSource,
    event_status: pricing.eventStatus,
  };
};

const activeProductWhere = {
  status: "Active" as const,
  isDeleted: false,
};

const productWithShopQuery = {
  shop: {
    select: {
      id: true,
      name: true,
      category: true,
      ratings: true,
      avatar: true,
      coverBanner: true,
      address: true,
    },
  },
};

const fallbackOrderBy = [
  { totalSales: "desc" as const },
  { ratings: "desc" as const },
  { updatedAt: "desc" as const },
];

const fetchFallbackProducts = async ({
  skip,
  take,
  excludeIds = [],
}: {
  skip: number;
  take: number;
  excludeIds?: string[];
}) =>
  prisma.products.findMany({
    where: {
      ...activeProductWhere,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    include: productWithShopQuery,
    orderBy: fallbackOrderBy,
    skip,
    take,
  });

export const getFallbackRecommendations = async ({
  page,
  limit,
  skip,
  reason = "Personalized recommendations are not enabled in Phase 1.",
  source = "fallback",
  trainingStatus = "not_needed",
}: {
  page: number;
  limit: number;
  skip: number;
  reason?: string;
  source?: RecommendationSource;
  trainingStatus?: TrainingStatus;
}) => {
  const [products, total] = await Promise.all([
    fetchFallbackProducts({ skip, take: limit }),
    prisma.products.count({ where: activeProductWhere }),
  ]);

  return {
    success: true,
    source,
    reason,
    page,
    limit,
    total,
    hasMore: page * limit < total,
    trainingStatus,
    recommendations: products.map(withEffectivePricingMetadata),
  };
};

const getActiveCachedProducts = async (cachedIds: string[]) => {
  if (cachedIds.length === 0) return [];

  const products = await prisma.products.findMany({
    where: {
      ...activeProductWhere,
      id: {
        in: cachedIds,
      },
    },
    include: productWithShopQuery,
  });
  const order = new Map(cachedIds.map((id, index) => [id, index]));

  return products.sort(
    (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
};

const getCachedRecommendationState = (analytics: {
  recommendations: string[];
  recommendationExpiresAt: Date | null;
  recommendationTrainingStatus: string | null;
  recommendationModelVersion: string | null;
  recommendationActionCount: number;
  supportedActionCount: number;
}) => {
  if (analytics.recommendations.length === 0) {
    return {
      source: "training_fallback" as const,
      trainingStatus: "missing_cache" as const,
      reason:
        "Recommendations are not trained yet. Run POST /recommendation/api/train/me to generate personalized recommendations.",
    };
  }

  const hasNewActionRefresh =
    analytics.supportedActionCount - analytics.recommendationActionCount >=
    ACTION_REFRESH_THRESHOLD;
  const hasFailedFallback =
    analytics.recommendationTrainingStatus === "failed" ||
    analytics.recommendationModelVersion === WEIGHTED_BASELINE_FALLBACK_ALGORITHM;
  const hasMissingExpiry = analytics.recommendationExpiresAt === null;
  const isExpired =
    analytics.recommendationExpiresAt !== null &&
    analytics.recommendationExpiresAt.getTime() <= Date.now();

  if (hasFailedFallback) {
    return {
      source: "cached" as const,
      trainingStatus: "failed" as const,
      reason: "Using fallback recommendations because the last TensorFlow training failed.",
      shouldRefresh: true,
      refreshReason: "stale" as const,
    };
  }

  if (hasMissingExpiry) {
    return {
      source: "cached" as const,
      trainingStatus: "stale" as const,
      reason: "Cached recommendations are missing an expiry. Refresh training has been started.",
      shouldRefresh: true,
      refreshReason: "stale" as const,
    };
  }

  if (isExpired) {
    return {
      source: "cached" as const,
      trainingStatus: "stale" as const,
      reason: "Cached recommendations are stale. Refresh training has been started.",
      shouldRefresh: true,
      refreshReason: "stale" as const,
    };
  }

  if (hasNewActionRefresh) {
    return {
      source: "cached" as const,
      trainingStatus: "stale" as const,
      reason: "Recommendations are being refreshed after new activity.",
      shouldRefresh: true,
      refreshReason: "new_actions" as const,
    };
  }

  return {
    source: "personalized" as const,
    trainingStatus: "fresh" as const,
    reason: undefined,
    shouldRefresh: false,
    refreshReason: undefined,
  };
};

export const getRecommendationsForUser = async ({
  user,
  pagination,
}: {
  user?: RecommendationUser;
  pagination: RecommendationPagination;
}) => {
  if (!user?.id) {
    return getFallbackRecommendations(pagination);
  }

  const analytics = await prisma.userAnalytics.findUnique({
    where: { userId: user.id },
    select: {
      actions: true,
      recommendations: true,
      recommendationExpiresAt: true,
      recommendationTrainingStatus: true,
      recommendationModelVersion: true,
      recommendationActionCount: true,
    },
  });

  if (!analytics) {
    return getFallbackRecommendations({
      ...pagination,
      reason: "No analytics found for personalized recommendations.",
    });
  }

  const supportedActionCount = countSupportedProductActions(
    analytics.actions as RawAnalyticsAction[],
  );

  if (supportedActionCount < MINIMUM_TRAINING_ACTIONS) {
    return getFallbackRecommendations({
      ...pagination,
      reason: "Not enough analytics actions for personalized recommendations.",
    });
  }

  const state = getCachedRecommendationState({
    ...analytics,
    supportedActionCount,
  });

  if (state.trainingStatus === "missing_cache") {
    const runtimeStatus = triggerRecommendationTrainingInBackground(
      user.id,
      "missing_cache",
    );

    return getFallbackRecommendations({
      ...pagination,
      source: state.source,
      trainingStatus: runtimeStatus === "running" ? "running" : "queued",
      reason:
        runtimeStatus === "running"
          ? "Recommendation training is already running. Showing fallback products for now."
          : "Recommendations are being trained. Showing fallback products for now.",
    });
  }

  let responseTrainingStatus: TrainingStatus = state.trainingStatus;
  let responseReason = state.reason;

  if (state.shouldRefresh && state.refreshReason) {
    const runtimeStatus = triggerRecommendationTrainingInBackground(
      user.id,
      state.refreshReason,
    );

    if (runtimeStatus === "running") {
      responseTrainingStatus = "running";
      responseReason =
        "Recommendation refresh is already running. Showing cached products for now.";
    } else if (runtimeStatus === "queued") {
      responseReason = responseReason || "Recommendation refresh has been queued.";
    }
  } else if (getRecommendationTrainingRuntimeStatus(user.id) === "running") {
    responseTrainingStatus = "running";
    responseReason =
      "Recommendation refresh is already running. Showing cached products for now.";
  }

  const cachedProducts = await getActiveCachedProducts(analytics.recommendations);
  const total = cachedProducts.length;
  const pageProducts = cachedProducts.slice(
    pagination.skip,
    pagination.skip + pagination.limit,
  );
  let products = pageProducts;
  let reason = responseReason;

  if (products.length < pagination.limit) {
    const remaining = pagination.limit - products.length;
    const excludeIds = new Set([
      ...cachedProducts.slice(0, pagination.skip + pagination.limit).map((product) => product.id),
      ...products.map((product) => product.id),
    ]);
    const fallbackProducts = await fetchFallbackProducts({
      skip: 0,
      take: remaining,
      excludeIds: Array.from(excludeIds),
    });

    if (fallbackProducts.length > 0) {
      products = [...products, ...fallbackProducts];
      reason = reason
        ? `${reason} Personalized recommendations were filled with fallback products.`
        : "Personalized recommendations were filled with fallback products.";
    }
  }

  return {
    success: true,
    source: state.source,
    reason,
    page: pagination.page,
    limit: pagination.limit,
    total,
    hasMore: pagination.skip + pagination.limit < total,
    trainingStatus: responseTrainingStatus,
    recommendations: products.map(withEffectivePricingMetadata),
  };
};
