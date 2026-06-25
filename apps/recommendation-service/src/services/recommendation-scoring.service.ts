import {
  getRecommendationActionWeight,
  isSupportedRecommendationAction,
} from "../utils/recommendation-constants";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

type RawAnalyticsAction = {
  action?: unknown;
  productId?: unknown;
  shopId?: unknown;
  createdAt?: unknown;
};

export type WeightedInteraction = {
  productId: string;
  shopId: string | null;
  action: "product_view" | "add_to_wishlist" | "add_to_cart";
  weight: number;
  createdAt: Date;
};

export type ScoringProduct = {
  id: string;
  category: string;
  subCategory: string;
  brand: string | null;
  shopId: string;
  tags: string[];
  ratings: number;
  totalSales: number;
  updatedAt: Date;
};

export type WeightedBaselineProductScore = {
  productId: string;
  score: number;
  ratings: number;
  totalSales: number;
  updatedAt: Date;
};

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && OBJECT_ID_PATTERN.test(value);

const toDate = (value: unknown) => {
  if (value instanceof Date) return value;

  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const incrementScore = (scores: Map<string, number>, key: string, amount: number) => {
  if (!key) return;
  scores.set(key, (scores.get(key) || 0) + amount);
};

const normalize = (scores: Map<string, number>, key: string) => {
  const value = scores.get(key) || 0;
  if (value <= 0) return 0;

  const max = Math.max(...scores.values(), 0);
  return max > 0 ? value / max : 0;
};

export const preprocessAnalyticsActions = (
  actions: RawAnalyticsAction[],
): WeightedInteraction[] =>
  actions.flatMap((action) => {
    const actionType = action.action;

    if (!isSupportedRecommendationAction(actionType)) return [];
    if (!isObjectId(action.productId)) return [];

    return [
      {
        productId: action.productId,
        shopId: isObjectId(action.shopId) ? action.shopId : null,
        action: actionType,
        weight: getRecommendationActionWeight(actionType),
        createdAt: toDate(action.createdAt),
      },
    ];
  });

export const scoreProductsWithWeightedBaseline = ({
  products,
  interactions,
}: {
  products: ScoringProduct[];
  interactions: WeightedInteraction[];
}): WeightedBaselineProductScore[] => {
  const productById = new Map(products.map((product) => [product.id, product]));
  const directProductScores = new Map<string, number>();
  const categoryScores = new Map<string, number>();
  const subCategoryScores = new Map<string, number>();
  const brandScores = new Map<string, number>();
  const shopScores = new Map<string, number>();
  const tagScores = new Map<string, number>();
  const interactedProductIds = new Set<string>();
  const maxSales = Math.max(...products.map((product) => product.totalSales), 0);

  interactions.forEach((interaction) => {
    const product = productById.get(interaction.productId);
    if (!product) return;

    interactedProductIds.add(product.id);
    incrementScore(directProductScores, product.id, interaction.weight);
    incrementScore(categoryScores, product.category, interaction.weight);
    incrementScore(subCategoryScores, product.subCategory, interaction.weight);
    incrementScore(shopScores, product.shopId, interaction.weight);

    if (product.brand) {
      incrementScore(brandScores, product.brand, interaction.weight);
    }

    product.tags.forEach((tag) => {
      incrementScore(tagScores, tag.toLowerCase(), interaction.weight);
    });
  });

  return products
    .map((product) => {
      const tagScore =
        product.tags.length > 0
          ? product.tags.reduce(
              (score, tag) => score + normalize(tagScores, tag.toLowerCase()),
              0,
            ) / product.tags.length
          : 0;
      const qualityBoost =
        Math.min(Math.max(product.ratings, 0), 5) / 5 * 0.03 +
        (maxSales > 0 ? Math.log1p(product.totalSales) / Math.log1p(maxSales) : 0) *
          0.02;
      const baseScore =
        normalize(directProductScores, product.id) * 0.45 +
        normalize(categoryScores, product.category) * 0.25 +
        normalize(subCategoryScores, product.subCategory) * 0.1 +
        (product.brand ? normalize(brandScores, product.brand) : 0) * 0.1 +
        normalize(shopScores, product.shopId) * 0.05 +
        tagScore * 0.05 +
        qualityBoost;
      const noveltyMultiplier = interactedProductIds.has(product.id) ? 0.85 : 1;

      return {
        productId: product.id,
        score: baseScore * noveltyMultiplier,
        ratings: product.ratings,
        totalSales: product.totalSales,
        updatedAt: product.updatedAt,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.ratings !== a.ratings) return b.ratings - a.ratings;
      if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
};

export const rankProductsWithWeightedBaseline = ({
  products,
  interactions,
  limit,
}: {
  products: ScoringProduct[];
  interactions: WeightedInteraction[];
  limit: number;
}) =>
  scoreProductsWithWeightedBaseline({ products, interactions })
    .slice(0, limit)
    .map((result) => result.productId);
