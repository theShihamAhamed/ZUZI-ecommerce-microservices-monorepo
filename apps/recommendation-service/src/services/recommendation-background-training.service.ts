import prisma from "@libs/prisma";
import {
  isRecommendationTrainingRunning,
  trainRecommendationsForUser,
} from "./recommendation-training.service";

type BackgroundTrainingReason = "missing_cache" | "stale" | "new_actions";

const queuedUsers = new Set<string>();

const getLogSafeUserId = (userId: string) => `${userId.slice(0, 6)}...${userId.slice(-4)}`;

export const getRecommendationTrainingRuntimeStatus = (userId: string) => {
  if (isRecommendationTrainingRunning(userId)) return "running" as const;
  if (queuedUsers.has(userId)) return "queued" as const;
  return "idle" as const;
};

export const triggerRecommendationTrainingInBackground = (
  userId: string,
  reason: BackgroundTrainingReason,
) => {
  if (isRecommendationTrainingRunning(userId) || queuedUsers.has(userId)) {
    return getRecommendationTrainingRuntimeStatus(userId);
  }

  queuedUsers.add(userId);

  void prisma.userAnalytics
    .updateMany({
      where: { userId },
      data: {
        recommendationTrainingStatus: "queued",
        recommendationTrainingError: null,
      },
    })
    .catch((error) => {
      console.error("[recommendation] failed to mark background training queued", {
        userId: getLogSafeUserId(userId),
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  console.log("[recommendation] queued background training", {
    userId: getLogSafeUserId(userId),
    reason,
  });

  setImmediate(() => {
    queuedUsers.delete(userId);

    void trainRecommendationsForUser(userId)
      .then((result) => {
        console.log("[recommendation] background training completed", {
          userId: getLogSafeUserId(userId),
          reason,
          success: result.success,
          trainingStatus: "trainingStatus" in result ? result.trainingStatus : undefined,
        });
      })
      .catch((error) => {
        console.error("[recommendation] background training failed", {
          userId: getLogSafeUserId(userId),
          reason,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  return "queued" as const;
};
