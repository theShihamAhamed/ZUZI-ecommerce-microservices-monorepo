import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import type { Prisma, ReviewStatus } from "@prisma/client";
import { getProductThumbnail } from "@libs/imageAssets";
import {
  getDateQuery,
  getListParams,
  getPagination,
  getPositiveNumber,
  getQueryString,
  isObjectIdLike,
} from "../utils/admin-query";

const reviewStatuses = ["Published", "Hidden", "Reported", "Deleted"] as const;

const getReviewSort = (
  sort?: string,
): Prisma.productReviewOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "highest-rating":
    case "highest_rating":
      return { rating: "desc" };
    case "lowest-rating":
    case "lowest_rating":
      return { rating: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
};

const getVisiblePublishedReviewWhere = (
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

const getReviewSummaryFromRatings = (ratings: number[]) => {
  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0
      ? Math.round(
          (ratings.reduce((total, rating) => total + rating, 0) / reviewCount) *
            10,
        ) / 10
      : 0;

  return {
    averageRating,
    reviewCount,
  };
};

const recalculateProductRating = async (productId: string) => {
  const reviews = await prisma.productReview.findMany({
    where: getVisiblePublishedReviewWhere({ productId }),
    select: {
      rating: true,
    },
  });
  const summary = getReviewSummaryFromRatings(
    reviews.map((review) => review.rating),
  );

  await prisma.products.update({
    where: {
      id: productId,
    },
    data: {
      ratings: summary.averageRating,
      reviewCount: summary.reviewCount,
    },
  });
};

const recalculateShopRating = async (shopId: string) => {
  const reviews = await prisma.productReview.findMany({
    where: getVisiblePublishedReviewWhere({ shopId }),
    select: {
      rating: true,
    },
  });
  const summary = getReviewSummaryFromRatings(
    reviews.map((review) => review.rating),
  );

  await prisma.shop.update({
    where: {
      id: shopId,
    },
    data: {
      ratings: summary.averageRating,
      reviewCount: summary.reviewCount,
    },
  });
};

const recalculateReviewTargets = async (review: {
  productId: string;
  shopId: string;
}) => {
  await Promise.all([
    recalculateProductRating(review.productId),
    recalculateShopRating(review.shopId),
  ]);
};

const getProductImage = (product?: { images?: any } | null) => {
  return getProductThumbnail(product);
};

const getReviewSummary = async () => {
  const reviews = await prisma.productReview.findMany({
    select: {
      status: true,
      rating: true,
      reportedAt: true,
      deletedAt: true,
    },
  });
  const publishedReviews = reviews.filter(
    (review) => review.status === "Published" && !review.deletedAt,
  );

  return {
    totalReviews: reviews.length,
    publishedCount: publishedReviews.length,
    hiddenCount: reviews.filter(
      (review) => review.status === "Hidden" && !review.deletedAt,
    ).length,
    reportedCount: reviews.filter((review) => Boolean(review.reportedAt)).length,
    deletedCount: reviews.filter(
      (review) => review.status === "Deleted" || Boolean(review.deletedAt),
    ).length,
    averageRating:
      publishedReviews.length > 0
        ? Math.round(
            (publishedReviews.reduce((sum, review) => sum + review.rating, 0) /
              publishedReviews.length) *
              10,
          ) / 10
        : 0,
  };
};

const getSearchFilters = async (q: string) => {
  const query = q.trim();

  if (!query) return [];

  const [products, users, sellers, shops] = await Promise.all([
    prisma.products.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 75,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 75,
    }),
    prisma.seller.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 75,
    }),
    prisma.shop.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true },
      take: 75,
    }),
  ]);
  const filters: Prisma.productReviewWhereInput[] = [
    { title: { contains: query, mode: "insensitive" } },
    { comment: { contains: query, mode: "insensitive" } },
  ];

  if (products.length > 0) {
    filters.push({ productId: { in: products.map((product) => product.id) } });
  }

  if (users.length > 0) {
    filters.push({ userId: { in: users.map((user) => user.id) } });
  }

  if (sellers.length > 0) {
    filters.push({ sellerId: { in: sellers.map((seller) => seller.id) } });
  }

  if (shops.length > 0) {
    filters.push({ shopId: { in: shops.map((shop) => shop.id) } });
  }

  return filters;
};

const buildReviewWhere = async (query: Record<string, unknown>) => {
  const params = getListParams(query);
  const status = getQueryString(query.status);
  const rating = getPositiveNumber(query.rating, 0);
  const reportedOnly = getQueryString(query.reportedOnly) === "true";
  const productId = getQueryString(query.productId);
  const sellerId = getQueryString(query.sellerId);
  const shopId = getQueryString(query.shopId);
  const userId = getQueryString(query.userId);
  const dateFrom = getDateQuery(query.dateFrom || query.from);
  const dateTo = getDateQuery(query.dateTo || query.to, true);
  const andFilters: Prisma.productReviewWhereInput[] = [];

  if (status && status !== "all") {
    if (!reviewStatuses.includes(status as any)) {
      throw new ValidationError("Invalid review status");
    }

    andFilters.push({ status: status as ReviewStatus });
  }

  if (rating >= 1 && rating <= 5) {
    andFilters.push({ rating });
  }

  if (reportedOnly) {
    andFilters.push({ reportedAt: { not: null } });
  }

  for (const [fieldName, value] of [
    ["productId", productId],
    ["sellerId", sellerId],
    ["shopId", shopId],
    ["userId", userId],
  ] as const) {
    if (!value || value === "all") continue;

    if (!isObjectIdLike(value)) {
      throw new ValidationError(`Invalid ${fieldName}`);
    }

    andFilters.push({ [fieldName]: value });
  }

  if (dateFrom || dateTo) {
    andFilters.push({
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }

  const searchFilters = await getSearchFilters(params.q);

  if (searchFilters.length > 0) {
    andFilters.push({
      OR: searchFilters,
    });
  }

  return {
    params,
    where:
      andFilters.length > 0
        ? ({
            AND: andFilters,
          } satisfies Prisma.productReviewWhereInput)
        : ({} satisfies Prisma.productReviewWhereInput),
  };
};

const loadReviewContext = async (reviews: Array<{
  productId: string;
  userId: string;
  sellerId: string;
  shopId: string;
}>) => {
  const productIds = [...new Set(reviews.map((review) => review.productId))];
  const userIds = [...new Set(reviews.map((review) => review.userId))];
  const sellerIds = [...new Set(reviews.map((review) => review.sellerId))];
  const shopIds = [...new Set(reviews.map((review) => review.shopId))];
  const [products, users, sellers, shops] = await Promise.all([
    productIds.length > 0
      ? prisma.products.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
          },
        })
      : [],
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [],
    sellerIds.length > 0
      ? prisma.seller.findMany({
          where: { id: { in: sellerIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [],
    shopIds.length > 0
      ? prisma.shop.findMany({
          where: { id: { in: shopIds } },
          select: {
            id: true,
            name: true,
          },
        })
      : [],
  ]);

  return {
    productById: new Map(products.map((product) => [product.id, product])),
    userById: new Map(users.map((user) => [user.id, user])),
    sellerById: new Map(sellers.map((seller) => [seller.id, seller])),
    shopById: new Map(shops.map((shop) => [shop.id, shop])),
  };
};

const serializeReview = (
  review: {
    id: string;
    productId: string;
    userId: string;
    sellerId: string;
    shopId: string;
    orderId?: string;
    orderItemId?: string;
    rating: number;
    title: string | null;
    comment: string | null;
    status: ReviewStatus;
    sellerReply: string | null;
    repliedAt: Date | null;
    reportedAt: Date | null;
    hiddenAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  context: Awaited<ReturnType<typeof loadReviewContext>>,
) => {
  const product = context.productById.get(review.productId);
  const user = context.userById.get(review.userId);
  const seller = context.sellerById.get(review.sellerId);
  const shop = context.shopById.get(review.shopId);

  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    status: review.status,
    sellerReply: review.sellerReply,
    repliedAt: review.repliedAt?.toISOString() || null,
    reportedAt: review.reportedAt?.toISOString() || null,
    hiddenAt: review.hiddenAt?.toISOString() || null,
    deletedAt: review.deletedAt?.toISOString() || null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    orderId: review.orderId,
    orderItemId: review.orderItemId,
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      : null,
    product: product
      ? {
          id: product.id,
          title: product.title,
          slug: product.slug,
          image: getProductImage(product),
        }
      : null,
    seller: seller
      ? {
          id: seller.id,
          name: seller.name,
          email: seller.email,
        }
      : null,
    shop: shop
      ? {
          id: shop.id,
          name: shop.name,
        }
      : null,
  };
};

export const getAdminReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { params, where } = await buildReviewWhere(req.query);
    const [reviews, total, summary] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: getReviewSort(params.sort),
        skip: params.skip,
        take: params.limit,
      }),
      prisma.productReview.count({ where }),
      getReviewSummary(),
    ]);
    const context = await loadReviewContext(reviews);
    const pagination = getPagination(total, params.page, params.limit);
    const serializedReviews = reviews.map((review) =>
      serializeReview(review, context),
    );

    return res.status(200).json({
      success: true,
      reviews: serializedReviews,
      data: serializedReviews,
      pagination,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
      summary,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminReviewDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundError("Review not found");
    }

    const context = await loadReviewContext([review]);

    return res.status(200).json({
      success: true,
      review: serializeReview(review, context),
      data: serializeReview(review, context),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminReviewStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reviewId } = req.params;
    const status = getQueryString(req.body?.status);

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    if (status !== "Published" && status !== "Hidden") {
      throw new ValidationError("Review status must be Published or Hidden");
    }

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.status === "Deleted" || review.deletedAt) {
      throw new NotFoundError("Review not found");
    }

    const updated = await prisma.productReview.update({
      where: { id: review.id },
      data:
        status === "Hidden"
          ? {
              status: "Hidden",
              hiddenAt: new Date(),
            }
          : {
              status: "Published",
              hiddenAt: null,
            },
    });

    await recalculateReviewTargets(updated);

    return res.status(200).json({
      success: true,
      review: {
        id: updated.id,
        status: updated.status,
        hiddenAt: updated.hiddenAt?.toISOString() || null,
      },
      message:
        updated.status === "Hidden"
          ? "Review hidden from public pages"
          : "Review published",
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundError("Review not found");
    }

    if (review.status === "Deleted" || review.deletedAt) {
      return res.status(200).json({
        success: true,
        message: "Review already deleted",
      });
    }

    const deleted = await prisma.productReview.update({
      where: { id: review.id },
      data: {
        status: "Deleted",
        deletedAt: new Date(),
      },
    });

    await recalculateReviewTargets(deleted);

    return res.status(200).json({
      success: true,
      message: "Review deleted",
    });
  } catch (error) {
    return next(error);
  }
};
