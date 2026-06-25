import * as tf from "@tensorflow/tfjs";
import { getProductEffectivePricing } from "@libs/product-pricing";
import {
  TFJS_TRAINING_BATCH_SIZE,
  TFJS_TRAINING_EPOCHS,
} from "../utils/recommendation-constants";
import {
  scoreProductsWithWeightedBaseline,
  ScoringProduct,
  WeightedInteraction,
} from "./recommendation-scoring.service";

export type TfjsRecommendationProduct = ScoringProduct & {
  regular_price: number;
  sale_price: number;
  event_sale_price: number | null;
  isEvent: boolean;
  starting_date: Date | null;
  ending_date: Date | null;
  reviewCount: number;
};

type FeatureVocabulary = {
  categoryIndex: Map<string, number>;
  subCategoryIndex: Map<string, number>;
  brandIndex: Map<string, number>;
  shopIndex: Map<string, number>;
  tagIndex: Map<string, number>;
  maxPrice: number;
  maxReviewCount: number;
  maxTotalSales: number;
  featureCount: number;
  numericStart: number;
};

type TrainingDataset = {
  features: number[][];
  labels: number[];
  positiveSamples: number;
  negativeSamples: number;
};

export type TfjsTrainingResult = {
  recommendations: string[];
  diagnostics: {
    positiveSamples: number;
    negativeSamples: number;
    featureCount: number;
    epochs: number;
    backend: string;
  };
};

const normalizeText = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

const buildIndex = (values: string[], startIndex: number) =>
  new Map(values.map((value, index) => [value, startIndex + index]));

const getEffectivePrice = (product: TfjsRecommendationProduct) =>
  getProductEffectivePricing(product).effectivePrice;

const normalizeNumber = (value: number, max: number) => {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  return Math.min(value / max, 1);
};

export const buildFeatureVocabulary = (
  products: TfjsRecommendationProduct[],
): FeatureVocabulary => {
  const categories = uniqueSorted(products.map((product) => normalizeText(product.category)));
  const subCategories = uniqueSorted(
    products.map((product) => normalizeText(product.subCategory)),
  );
  const brands = uniqueSorted(products.map((product) => normalizeText(product.brand)));
  const shops = uniqueSorted(products.map((product) => normalizeText(product.shopId)));
  const tagFrequency = new Map<string, number>();

  products.forEach((product) => {
    product.tags.forEach((tag) => {
      const normalized = normalizeText(tag);
      if (!normalized) return;
      tagFrequency.set(normalized, (tagFrequency.get(normalized) || 0) + 1);
    });
  });

  const tags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 80)
    .map(([tag]) => tag);

  let offset = 0;
  const categoryIndex = buildIndex(categories, offset);
  offset += categories.length;
  const subCategoryIndex = buildIndex(subCategories, offset);
  offset += subCategories.length;
  const brandIndex = buildIndex(brands, offset);
  offset += brands.length;
  const shopIndex = buildIndex(shops, offset);
  offset += shops.length;
  const tagIndex = buildIndex(tags, offset);
  offset += tags.length;

  const maxPrice = Math.max(...products.map(getEffectivePrice), 0);
  const maxReviewCount = Math.max(...products.map((product) => product.reviewCount), 0);
  const maxTotalSales = Math.max(...products.map((product) => product.totalSales), 0);

  return {
    categoryIndex,
    subCategoryIndex,
    brandIndex,
    shopIndex,
    tagIndex,
    maxPrice,
    maxReviewCount,
    maxTotalSales,
    numericStart: offset,
    featureCount: offset + 4,
  };
};

const setFeature = (
  vector: number[],
  index: Map<string, number>,
  value: string | null | undefined,
) => {
  const featureIndex = index.get(normalizeText(value));
  if (featureIndex !== undefined) {
    vector[featureIndex] = 1;
  }
};

export const encodeProductFeature = (
  product: TfjsRecommendationProduct,
  vocabulary: FeatureVocabulary,
) => {
  const vector = Array.from({ length: vocabulary.featureCount }, () => 0);

  setFeature(vector, vocabulary.categoryIndex, product.category);
  setFeature(vector, vocabulary.subCategoryIndex, product.subCategory);
  setFeature(vector, vocabulary.brandIndex, product.brand);
  setFeature(vector, vocabulary.shopIndex, product.shopId);

  product.tags.forEach((tag) => {
    const featureIndex = vocabulary.tagIndex.get(normalizeText(tag));
    if (featureIndex !== undefined) {
      vector[featureIndex] = 1;
    }
  });

  vector[vocabulary.numericStart] = normalizeNumber(
    getEffectivePrice(product),
    vocabulary.maxPrice,
  );
  vector[vocabulary.numericStart + 1] = normalizeNumber(product.ratings, 5);
  vector[vocabulary.numericStart + 2] = normalizeNumber(
    product.reviewCount,
    vocabulary.maxReviewCount,
  );
  vector[vocabulary.numericStart + 3] = normalizeNumber(
    product.totalSales,
    vocabulary.maxTotalSales,
  );

  return vector;
};

const buildPositiveLabels = (interactions: WeightedInteraction[]) => {
  const scores = new Map<string, number>();

  interactions.forEach((interaction) => {
    scores.set(
      interaction.productId,
      (scores.get(interaction.productId) || 0) + interaction.weight,
    );
  });

  const maxScore = Math.max(...scores.values(), 0);

  return Array.from(scores.entries()).map(([productId, score]) => ({
    productId,
    label: maxScore > 0 ? Math.min(1, 0.2 + (score / maxScore) * 0.8) : 0.2,
  }));
};

const selectNegativeProducts = ({
  products,
  interactedProductIds,
  count,
}: {
  products: TfjsRecommendationProduct[];
  interactedProductIds: Set<string>;
  count: number;
}) => {
  const categoryBuckets = new Map<string, TfjsRecommendationProduct[]>();

  products.forEach((product) => {
    if (interactedProductIds.has(product.id)) return;

    const category = normalizeText(product.category) || "uncategorized";
    const bucket = categoryBuckets.get(category) || [];
    bucket.push(product);
    categoryBuckets.set(category, bucket);
  });

  const buckets = Array.from(categoryBuckets.values()).filter((bucket) => bucket.length > 0);
  const negatives: TfjsRecommendationProduct[] = [];
  let cursor = 0;

  while (negatives.length < count && buckets.length > 0) {
    const bucket = buckets[cursor % buckets.length];
    const product = bucket.shift();

    if (product) {
      negatives.push(product);
    }

    if (bucket.length === 0) {
      buckets.splice(cursor % buckets.length, 1);
      cursor = 0;
    } else {
      cursor += 1;
    }
  }

  return negatives;
};

export const buildTrainingDataset = ({
  products,
  interactions,
  vocabulary,
}: {
  products: TfjsRecommendationProduct[];
  interactions: WeightedInteraction[];
  vocabulary: FeatureVocabulary;
}): TrainingDataset => {
  const productById = new Map(products.map((product) => [product.id, product]));
  const positiveLabels = buildPositiveLabels(interactions).filter(({ productId }) =>
    productById.has(productId),
  );
  const interactedProductIds = new Set(positiveLabels.map(({ productId }) => productId));
  const negativeSampleCount = Math.min(positiveLabels.length * 2, 200);
  const negativeProducts = selectNegativeProducts({
    products,
    interactedProductIds,
    count: negativeSampleCount,
  });
  const features: number[][] = [];
  const labels: number[] = [];

  positiveLabels.forEach(({ productId, label }) => {
    const product = productById.get(productId);
    if (!product) return;

    features.push(encodeProductFeature(product, vocabulary));
    labels.push(label);
  });

  negativeProducts.forEach((product) => {
    features.push(encodeProductFeature(product, vocabulary));
    labels.push(0.05);
  });

  return {
    features,
    labels,
    positiveSamples: positiveLabels.length,
    negativeSamples: negativeProducts.length,
  };
};

const createModel = (featureCount: number) => {
  const model = tf.sequential();

  model.add(tf.layers.dense({ units: 64, activation: "relu", inputShape: [featureCount] }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "meanSquaredError",
  });

  return model;
};

const normalizeBaselineScores = (
  products: TfjsRecommendationProduct[],
  interactions: WeightedInteraction[],
) => {
  const baselineScores = scoreProductsWithWeightedBaseline({ products, interactions });
  const maxScore = Math.max(...baselineScores.map((result) => result.score), 0);

  return new Map(
    baselineScores.map((result) => [
      result.productId,
      maxScore > 0 ? result.score / maxScore : 0,
    ]),
  );
};

export const trainTfjsHybridRecommendations = async ({
  products,
  interactions,
  limit,
}: {
  products: TfjsRecommendationProduct[];
  interactions: WeightedInteraction[];
  limit: number;
}): Promise<TfjsTrainingResult> => {
  await tf.setBackend("cpu");
  await tf.ready();

  const vocabulary = buildFeatureVocabulary(products);
  const dataset = buildTrainingDataset({ products, interactions, vocabulary });

  if (dataset.features.length === 0) {
    throw new Error("No valid TensorFlow.js training samples were generated.");
  }

  let xs: tf.Tensor2D | undefined;
  let ys: tf.Tensor2D | undefined;
  let predictionFeatures: tf.Tensor2D | undefined;
  let predictions: tf.Tensor | undefined;
  let model: tf.Sequential | undefined;

  try {
    xs = tf.tensor2d(dataset.features, [dataset.features.length, vocabulary.featureCount]);
    ys = tf.tensor2d(dataset.labels, [dataset.labels.length, 1]);
    model = createModel(vocabulary.featureCount);

    await model.fit(xs, ys, {
      epochs: TFJS_TRAINING_EPOCHS,
      batchSize: Math.min(TFJS_TRAINING_BATCH_SIZE, dataset.features.length),
      shuffle: true,
      verbose: 0,
    });

    predictionFeatures = tf.tensor2d(
      products.map((product) => encodeProductFeature(product, vocabulary)),
      [products.length, vocabulary.featureCount],
    );
    predictions = model.predict(predictionFeatures) as tf.Tensor;
    const tensorflowScores = Array.from(await predictions.data());
    const baselineScoreByProductId = normalizeBaselineScores(products, interactions);

    const recommendations = products
      .map((product, index) => {
        const tensorflowScore = Number(tensorflowScores[index] || 0);
        const baselineScore = baselineScoreByProductId.get(product.id) || 0;

        return {
          productId: product.id,
          finalScore: tensorflowScore * 0.75 + baselineScore * 0.25,
          tensorflowScore,
          baselineScore,
          ratings: product.ratings,
          totalSales: product.totalSales,
          updatedAt: product.updatedAt,
        };
      })
      .sort((a, b) => {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
        if (b.ratings !== a.ratings) return b.ratings - a.ratings;
        if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, limit)
      .map((result) => result.productId);

    return {
      recommendations,
      diagnostics: {
        positiveSamples: dataset.positiveSamples,
        negativeSamples: dataset.negativeSamples,
        featureCount: vocabulary.featureCount,
        epochs: TFJS_TRAINING_EPOCHS,
        backend: tf.getBackend(),
      },
    };
  } finally {
    xs?.dispose();
    ys?.dispose();
    predictionFeatures?.dispose();
    predictions?.dispose();
    model?.dispose();
  }
};
