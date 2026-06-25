export const RECOMMENDATION_ALGORITHM = "tfjs-hybrid-js-v1";
export const WEIGHTED_BASELINE_ALGORITHM = "weighted-baseline-v1";
export const WEIGHTED_BASELINE_FALLBACK_ALGORITHM =
  "weighted-baseline-fallback-v1";
export const MINIMUM_TRAINING_ACTIONS = 50;
export const MAX_CACHED_RECOMMENDATIONS = 100;
export const RECOMMENDATION_CACHE_TTL_HOURS = 24;
export const TFJS_TRAINING_EPOCHS = 18;
export const TFJS_TRAINING_BATCH_SIZE = 32;

export const SUPPORTED_ACTION_WEIGHTS = {
  product_view: 0.2,
  add_to_wishlist: 0.6,
  add_to_cart: 0.8,
} as const;

export type SupportedRecommendationAction =
  keyof typeof SUPPORTED_ACTION_WEIGHTS;

export const isSupportedRecommendationAction = (
  action: unknown,
): action is SupportedRecommendationAction =>
  typeof action === "string" && action in SUPPORTED_ACTION_WEIGHTS;

export const getRecommendationActionWeight = (
  action: SupportedRecommendationAction,
) => SUPPORTED_ACTION_WEIGHTS[action];
