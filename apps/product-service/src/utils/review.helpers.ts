import prisma from "@libs/prisma";
import { ValidationError } from "@error-handler";
import type { Prisma } from "@prisma/client";

type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

const REVIEW_TITLE_MAX_LENGTH = 120;
const REVIEW_COMMENT_MAX_LENGTH = 2000;

export const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export const getReviewPagination = (
  total: number,
  page: number,
  limit: number,
) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    totalCount: total,
    totalItems: total,
    page,
    currentPage: page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const getEmptyDistribution = (): RatingDistribution => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
});

const roundRating = (value: number) => Math.round(value * 10) / 10;

const getReviewSummaryFromRatings = (ratings: number[]) => {
  const distribution = getEmptyDistribution();

  ratings.forEach((rating) => {
    if (rating >= 1 && rating <= 5) {
      distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  });

  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0
      ? roundRating(
          ratings.reduce((total, rating) => total + rating, 0) / reviewCount,
        )
      : 0;

  return {
    averageRating,
    reviewCount,
    distribution,
  };
};

const getPublishedReviewWhere = (
  where: Prisma.productReviewWhereInput,
): Prisma.productReviewWhereInput => ({
  ...where,
  status: "Published",
  OR: [
    {
      deletedAt: null,
    },
    {
      deletedAt: {
        isSet: false,
      },
    },
  ],
});

export const assertValidReviewRating = (rating: unknown) => {
  const parsed = Number(rating);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new ValidationError("Review rating must be an integer from 1 to 5");
  }

  return parsed;
};

export const sanitizeReviewText = (
  value: unknown,
  {
    fieldName,
    maxLength,
    required = false,
  }: {
    fieldName: string;
    maxLength?: number;
    required?: boolean;
  },
) => {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${fieldName} is required`);
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be text`);
  }

  const sanitized = value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (required && !sanitized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (maxLength && sanitized.length > maxLength) {
    throw new ValidationError(
      `${fieldName} cannot be longer than ${maxLength} characters`,
    );
  }

  return sanitized || undefined;
};

export const sanitizeReviewTitle = (value: unknown) =>
  sanitizeReviewText(value, {
    fieldName: "Review title",
    maxLength: REVIEW_TITLE_MAX_LENGTH,
  });

export const sanitizeReviewComment = (value: unknown) =>
  sanitizeReviewText(value, {
    fieldName: "Review comment",
    maxLength: REVIEW_COMMENT_MAX_LENGTH,
  });

export const getProductReviewSummary = async (productId: string) => {
  const reviews = await prisma.productReview.findMany({
    where: getPublishedReviewWhere({ productId }),
    select: {
      rating: true,
    },
  });

  return getReviewSummaryFromRatings(reviews.map((review) => review.rating));
};

export const getShopReviewSummary = async (shopId: string) => {
  const reviews = await prisma.productReview.findMany({
    where: getPublishedReviewWhere({ shopId }),
    select: {
      rating: true,
    },
  });

  return getReviewSummaryFromRatings(reviews.map((review) => review.rating));
};

export const recalculateProductRating = async (productId: string) => {
  const summary = await getProductReviewSummary(productId);

  await prisma.products.update({
    where: { id: productId },
    data: {
      ratings: summary.averageRating,
      reviewCount: summary.reviewCount,
    },
  });

  return summary;
};

export const recalculateShopRating = async (shopId: string) => {
  const summary = await getShopReviewSummary(shopId);

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      ratings: summary.averageRating,
      reviewCount: summary.reviewCount,
    },
  });

  return summary;
};

const getSafeReviewUsersById = async (userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, any>();

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  });

  return new Map(users.map((user) => [user.id, user]));
};

const getReviewProductsById = async (productIds: string[]) => {
  if (productIds.length === 0) return new Map<string, any>();

  const products = await prisma.products.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      images: true,
    },
  });

  return new Map(products.map((product) => [product.id, product]));
};

export const getPublicProductReviews = async ({
  productId,
  page,
  limit,
}: {
  productId: string;
  page: number;
  limit: number;
}) => {
  const skip = (page - 1) * limit;
  const where = getPublishedReviewWhere({ productId });
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.productReview.count({ where }),
  ]);
  const usersById = await getSafeReviewUsersById([
    ...new Set(reviews.map((review) => review.userId)),
  ]);

  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      productId: review.productId,
      orderItemId: review.orderItemId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      sellerReply: review.sellerReply,
      repliedAt: review.repliedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      verifiedPurchase: true,
      user: usersById.get(review.userId) || null,
    })),
    pagination: getReviewPagination(total, page, limit),
  };
};

export const getPublicShopReviews = async ({
  shopId,
  page,
  limit,
}: {
  shopId: string;
  page: number;
  limit: number;
}) => {
  const skip = (page - 1) * limit;
  const where = getPublishedReviewWhere({ shopId });
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.productReview.count({ where }),
  ]);
  const [usersById, productsById] = await Promise.all([
    getSafeReviewUsersById([...new Set(reviews.map((review) => review.userId))]),
    getReviewProductsById([
      ...new Set(reviews.map((review) => review.productId)),
    ]),
  ]);

  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      productId: review.productId,
      orderItemId: review.orderItemId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      sellerReply: review.sellerReply,
      repliedAt: review.repliedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      verifiedPurchase: true,
      user: usersById.get(review.userId) || null,
      product: productsById.get(review.productId) || null,
    })),
    pagination: getReviewPagination(total, page, limit),
  };
};
