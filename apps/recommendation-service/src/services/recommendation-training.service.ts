import prisma from "@libs/prisma";
import {
  MAX_CACHED_RECOMMENDATIONS,
  MINIMUM_TRAINING_ACTIONS,
  RECOMMENDATION_ALGORITHM,
  RECOMMENDATION_CACHE_TTL_HOURS,
  WEIGHTED_BASELINE_FALLBACK_ALGORITHM,
} from "../utils/recommendation-constants";
import {
  preprocessAnalyticsActions,
  rankProductsWithWeightedBaseline,
} from "./recommendation-scoring.service";
import { trainTfjsHybridRecommendations } from "./recommendation-tfjs.service";

const trainingLocks = new Set<string>();

export const isRecommendationTrainingRunning = (userId: string) =>
  trainingLocks.has(userId);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const compactErrorMessage = (error: unknown) =>
  getErrorMessage(error).slice(0, 300);

const getExpiresAt = (trainedAt: Date) =>
  new Date(trainedAt.getTime() + RECOMMENDATION_CACHE_TTL_HOURS * 60 * 60 * 1000);

const markTrainingFailed = async ({
  userId,
  message,
  actionCount,
}: {
  userId: string;
  message: string;
  actionCount?: number;
}) => {
  await prisma.userAnalytics.updateMany({
    where: { userId },
    data: {
      recommendationTrainingStatus: "failed",
      recommendationTrainingError: message,
      ...(typeof actionCount === "number"
        ? { recommendationActionCount: actionCount }
        : {}),
    },
  });
};

const getFallbackRecommendations = ({
  products,
  interactions,
}: {
  products: Parameters<typeof rankProductsWithWeightedBaseline>[0]["products"];
  interactions: Parameters<typeof rankProductsWithWeightedBaseline>[0]["interactions"];
}) =>
  rankProductsWithWeightedBaseline({
    products,
    interactions,
    limit: MAX_CACHED_RECOMMENDATIONS,
  });

export const trainRecommendationsForUser = async (userId: string) => {
  if (trainingLocks.has(userId)) {
    return {
      success: false as const,
      trainingStatus: "running" as const,
      reason: "Recommendation training is already running for this user.",
    };
  }

  trainingLocks.add(userId);

  try {
    const analytics = await prisma.userAnalytics.findUnique({
      where: { userId },
    });

    if (!analytics) {
      return {
        success: false as const,
        reason: "Not enough analytics actions to train recommendations.",
        actionCount: 0,
        minimumActions: MINIMUM_TRAINING_ACTIONS,
      };
    }

    const interactions = preprocessAnalyticsActions(analytics.actions as any[]);
    const actionCount = interactions.length;

    if (actionCount < MINIMUM_TRAINING_ACTIONS) {
      await markTrainingFailed({
        userId,
        actionCount,
        message: "Not enough analytics actions to train recommendations.",
      });

      return {
        success: false as const,
        reason: "Not enough analytics actions to train recommendations.",
        actionCount,
        minimumActions: MINIMUM_TRAINING_ACTIONS,
      };
    }

    await prisma.userAnalytics.update({
      where: { userId },
      data: {
        recommendationTrainingStatus: "running",
        recommendationTrainingError: null,
      },
    });

    const products = await prisma.products.findMany({
      where: {
        status: "Active",
        isDeleted: false,
      },
      select: {
        id: true,
        category: true,
        subCategory: true,
        brand: true,
        shopId: true,
        tags: true,
        regular_price: true,
        sale_price: true,
        event_sale_price: true,
        isEvent: true,
        starting_date: true,
        ending_date: true,
        ratings: true,
        reviewCount: true,
        totalSales: true,
        updatedAt: true,
      },
    });

    if (products.length === 0) {
      throw new Error("No active products are available for recommendation training.");
    }

    const trainedAt = new Date();
    const expiresAt = getExpiresAt(trainedAt);

    try {
      const training = await trainTfjsHybridRecommendations({
        products,
        interactions,
        limit: MAX_CACHED_RECOMMENDATIONS,
      });

      await prisma.userAnalytics.update({
        where: { userId },
        data: {
          recommendations: training.recommendations,
          recommendationsLastTrained: trainedAt,
          recommendationModelVersion: RECOMMENDATION_ALGORITHM,
          recommendationActionCount: actionCount,
          recommendationExpiresAt: expiresAt,
          recommendationTrainingStatus: "fresh",
          recommendationTrainingError: null,
        },
      });

      return {
        success: true as const,
        trainingStatus: "fresh" as const,
        algorithm: RECOMMENDATION_ALGORITHM,
        actionCount,
        cachedRecommendationCount: training.recommendations.length,
        trainedAt: trainedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        recommendations: training.recommendations,
        diagnostics: training.diagnostics,
      };
    } catch (tensorflowError) {
      const message = compactErrorMessage(tensorflowError);
      const fallbackRecommendations = getFallbackRecommendations({
        products,
        interactions,
      });

      await prisma.userAnalytics.update({
        where: { userId },
        data: {
          recommendations: fallbackRecommendations,
          recommendationsLastTrained: trainedAt,
          recommendationModelVersion: WEIGHTED_BASELINE_FALLBACK_ALGORITHM,
          recommendationActionCount: actionCount,
          recommendationExpiresAt: expiresAt,
          recommendationTrainingStatus: "failed",
          recommendationTrainingError: message,
        },
      });

      return {
        success: true as const,
        trainingStatus: "failed" as const,
        algorithm: WEIGHTED_BASELINE_FALLBACK_ALGORITHM,
        fallbackUsed: true as const,
        reason: `TensorFlow.js training failed: ${message}`,
        actionCount,
        cachedRecommendationCount: fallbackRecommendations.length,
        trainedAt: trainedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        recommendations: fallbackRecommendations,
      };
    }
  } catch (error) {
    const message = compactErrorMessage(error);

    await markTrainingFailed({
      userId,
      message,
    });

    return {
      success: false as const,
      trainingStatus: "failed" as const,
      reason: message,
    };
  } finally {
    trainingLocks.delete(userId);
  }
};
