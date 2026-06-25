import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import imagekit from "@libs/imageKit";
import fs from "fs";
import {
  hashReviewRequestToken,
  parseReviewRequestCode,
} from "@libs/review-token";
import {
  getProductEffectivePricing,
  validateEventSalePrice,
} from "@libs/product-pricing";
import {
  getImageUrl,
  getProductThumbnail,
  normalizeImageAsset,
  normalizeImageAssetArray,
} from "@libs/imageAssets";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@error-handler";
import type { Prisma } from "@prisma/client";
import {
  assertValidReviewRating,
  getProductReviewSummary,
  getPublicProductReviews,
  getPublicShopReviews,
  getShopReviewSummary,
  recalculateProductRating,
  recalculateShopRating,
  sanitizeReviewText,
  sanitizeReviewComment,
  sanitizeReviewTitle,
} from "../utils/review.helpers";
import { publishProductNotification } from "../utils/notification.publisher";

const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value : undefined;
};

const getPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(getQueryString(value));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

const getOptionalNumber = (value: unknown) => {
  const parsed = Number(getQueryString(value));

  return Number.isFinite(parsed) ? parsed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getAuthenticatedCustomerId = (req: Request) => {
  const role = (req as any).role;
  const user = (req as any).user;

  if (role !== "user") {
    throw new ForbiddenError("Only customers can manage product reviews");
  }

  if (!user?.id || typeof user.id !== "string") {
    throw new ForbiddenError("Customer account not found");
  }

  return user.id as string;
};

const getStatusHistoryDate = (history: unknown, status: string) => {
  if (!Array.isArray(history)) return undefined;

  const entry = [...history].reverse().find((item) => {
    return (
      isRecord(item) &&
      typeof item.status === "string" &&
      item.status === status
    );
  });

  if (!isRecord(entry) || typeof entry.createdAt !== "string") {
    return undefined;
  }

  return entry.createdAt;
};

const getDeliveredAt = (order: {
  status: string;
  updatedAt: Date;
  statusHistory: unknown;
}) =>
  getStatusHistoryDate(order.statusHistory, "Delivered") ||
  (order.status === "Delivered" ? order.updatedAt.toISOString() : undefined);

const getSafeReviewPayload = (review: {
  id: string;
  productId?: string;
  orderId?: string;
  orderItemId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: review.id,
  ...(review.productId ? { productId: review.productId } : {}),
  ...(review.orderId ? { orderId: review.orderId } : {}),
  orderItemId: review.orderItemId,
  rating: review.rating,
  title: review.title,
  comment: review.comment,
  status: review.status,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const getReviewableProduct = async (productId: string) => {
  if (!productId || !isObjectIdLike(productId)) {
    throw new ValidationError("Invalid product ID");
  }

  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      shopId: true,
      isDeleted: true,
      shop: {
        select: {
          sellerId: true,
        },
      },
    },
  });

  if (!product || product.isDeleted) {
    throw new NotFoundError("Product not found");
  }

  return product;
};

const publishNewReviewNotification = ({
  reviewId,
  sellerId,
  productId,
  productName,
  shopId,
  rating,
}: {
  reviewId: string;
  sellerId: string;
  productId: string;
  productName: string;
  shopId: string;
  rating: number;
}) => {
  void publishProductNotification({
    recipientType: "seller",
    recipientId: sellerId,
    type: "NEW_REVIEW",
    title: "New product review",
    message: `You received a new review for ${productName}.`,
    redirectUrl: "/dashboard/reviews",
    data: {
      reviewId,
      productId,
      productName,
      sellerId,
      shopId,
      rating,
    },
    dedupeKey: `seller:new-review:${sellerId}:${reviewId}`,
  });
};

const publishReviewReplyNotification = ({
  reviewId,
  userId,
  sellerId,
  productId,
  productName,
  shopId,
  rating,
  repliedAt,
}: {
  reviewId: string;
  userId: string;
  sellerId: string;
  productId: string;
  productName: string;
  shopId: string;
  rating: number;
  repliedAt: Date;
}) => {
  void publishProductNotification({
    recipientType: "user",
    recipientId: userId,
    type: "REVIEW_REPLY",
    title: "Seller replied to your review",
    message: `The seller replied to your review for ${productName}.`,
    redirectUrl: "/profile?tab=my-reviews",
    data: {
      reviewId,
      productId,
      productName,
      sellerId,
      shopId,
      rating,
    },
    dedupeKey: `user:review-reply:${userId}:${reviewId}:${repliedAt.getTime()}`,
  });
};

const getCustomerProductOrderItems = async (
  userId: string,
  productId: string,
) => {
  const orders = await prisma.orders.findMany({
    where: { userId },
    select: {
      id: true,
      paymentStatus: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      statusHistory: true,
    },
  });
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length === 0) return [];

  const orderItems = await prisma.orderItems.findMany({
    where: {
      productId,
      orderId: {
        in: orderIds,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orderItems.flatMap((orderItem) => {
    const order = ordersById.get(orderItem.orderId);

    if (!order) return [];

    return [{ orderItem, order }];
  });
};

const isDeliveredPaidOrder = (order: {
  paymentStatus: string;
  status: string;
}) => order.paymentStatus === "Succeeded" && order.status === "Delivered";

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const getProductImageUrl = (product?: { images?: unknown } | null) =>
  getProductThumbnail(product);

const assertValidReviewRequestCode = (rawCode: string) => {
  const code = rawCode.trim();
  const parsed = parseReviewRequestCode(code);
  const containsSecretSeparator = code.includes(".");

  if (!parsed.publicId || (containsSecretSeparator && !parsed.hasSecret)) {
    throw new ValidationError("Invalid review request code");
  }

  return parsed;
};

const validateReviewRequestToken = (
  request: { tokenHash: string },
  parsedCode: ReturnType<typeof parseReviewRequestCode>,
) => {
  if (!parsedCode.hasSecret) return;

  if (!parsedCode.token) {
    throw new ValidationError("Invalid review request code");
  }

  const tokenHash = hashReviewRequestToken(parsedCode.token);

  if (tokenHash !== request.tokenHash) {
    throw new ValidationError("Invalid review request code");
  }
};

const getReviewRequestByCode = async (
  code: string,
  userId: string,
) => {
  const parsedCode = assertValidReviewRequestCode(code);
  const request = await prisma.reviewRequest.findUnique({
    where: {
      publicId: parsedCode.publicId,
    },
  });

  if (!request) {
    throw new NotFoundError("Review request not found");
  }

  validateReviewRequestToken(request, parsedCode);

  if (request.userId !== userId) {
    throw new ForbiddenError("Review request does not belong to this account");
  }

  return request;
};

const expireReviewRequestIfNeeded = async (request: {
  id: string;
  status: string;
  expiresAt: Date;
}) => {
  if (request.status !== "Pending" || request.expiresAt >= new Date()) {
    return request.status;
  }

  await prisma.reviewRequest.update({
    where: {
      id: request.id,
    },
    data: {
      status: "Expired",
    },
  });

  return "Expired";
};

const getReviewRequestContext = async (
  request: Awaited<ReturnType<typeof getReviewRequestByCode>>,
) => {
  const [product, order, orderItem, existingReview] = await Promise.all([
    prisma.products.findUnique({
      where: {
        id: request.productId,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        isDeleted: true,
        images: {
          select: {
            url: true,
          },
        },
      },
    }),
    prisma.orders.findFirst({
      where: {
        id: request.orderId,
        userId: request.userId,
      },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        status: true,
        updatedAt: true,
        statusHistory: true,
      },
    }),
    prisma.orderItems.findFirst({
      where: {
        id: request.orderItemId,
        orderId: request.orderId,
        productId: request.productId,
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        quantity: true,
      },
    }),
    prisma.productReview.findUnique({
      where: {
        orderItemId: request.orderItemId,
      },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    product,
    order,
    orderItem,
    existingReview,
  };
};

const getReviewRequestState = async (
  request: Awaited<ReturnType<typeof getReviewRequestByCode>>,
  context: Awaited<ReturnType<typeof getReviewRequestContext>>,
) => {
  const status = await expireReviewRequestIfNeeded(request);

  if (status === "Used") {
    return {
      status,
      canSubmit: false,
      reason: "This review request has already been used.",
    };
  }

  if (status === "Expired") {
    return {
      status,
      canSubmit: false,
      reason: "This review request has expired.",
    };
  }

  if (status === "Revoked") {
    return {
      status,
      canSubmit: false,
      reason: "This review request is no longer available.",
    };
  }

  if (!context.product || context.product.isDeleted) {
    return {
      status,
      canSubmit: false,
      reason: "Product is no longer available for review.",
    };
  }

  if (!context.order || !isDeliveredPaidOrder(context.order)) {
    return {
      status,
      canSubmit: false,
      reason: "Order must be paid and delivered before review.",
    };
  }

  if (!context.orderItem) {
    return {
      status,
      canSubmit: false,
      reason: "Order item is no longer available for review.",
    };
  }

  if (context.existingReview) {
    return {
      status,
      canSubmit: false,
      reason: "This order item already has a review.",
    };
  }

  return {
    status,
    canSubmit: true,
    reason: undefined,
  };
};

const serializeReviewRequestContext = ({
  request,
  context,
  state,
}: {
  request: Awaited<ReturnType<typeof getReviewRequestByCode>>;
  context: Awaited<ReturnType<typeof getReviewRequestContext>>;
  state: Awaited<ReturnType<typeof getReviewRequestState>>;
}) => ({
  publicId: request.publicId,
  status: state.status,
  expiresAt: request.expiresAt.toISOString(),
  usedAt: request.usedAt?.toISOString() || null,
  canSubmit: state.canSubmit,
  ...(state.reason ? { reason: state.reason } : {}),
  product: context.product
    ? {
        id: context.product.id,
        title: context.product.title,
        slug: context.product.slug,
        image: getProductImageUrl(context.product),
      }
    : null,
  order: context.order
    ? {
        id: context.order.id,
        orderNumber: context.order.orderNumber,
        deliveredAt: getDeliveredAt(context.order),
      }
    : null,
  orderItem: context.orderItem
    ? {
        id: context.orderItem.id,
        title: context.orderItem.title,
        imageUrl: context.orderItem.imageUrl,
        quantity: context.orderItem.quantity,
      }
    : null,
  existingReview: context.existingReview
    ? {
        id: context.existingReview.id,
        rating: context.existingReview.rating,
        title: context.existingReview.title,
        comment: context.existingReview.comment,
        createdAt: context.existingReview.createdAt.toISOString(),
      }
    : null,
});

const normalizeStringList = (values: unknown) => {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (typeof value !== "string") return [];

    const trimmed = value.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) return [];

    seen.add(key);
    return [trimmed];
  });
};

const normalizeProductOptionGroups = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  const seenGroupNames = new Set<string>();

  return value.flatMap((group) => {
    if (!isRecord(group)) return [];

    const name = typeof group.name === "string" ? group.name.trim() : "";
    const values = normalizeStringList(group.values);

    if (!name && values.length === 0) return [];

    if (!name) {
      throw new ValidationError("Every option group needs a name");
    }

    if (values.length === 0) {
      throw new ValidationError(`${name} needs at least one option value`);
    }

    const key = name.toLowerCase();

    if (seenGroupNames.has(key)) {
      throw new ValidationError(`${name} option group is duplicated`);
    }

    seenGroupNames.add(key);

    return [
      {
        id:
          typeof group.id === "string" && group.id.trim()
            ? group.id.trim()
            : key,
        name,
        values,
        required: group.required !== false,
      },
    ];
  });
};

const getOptionGroupValues = (
  optionGroups: ReturnType<typeof normalizeProductOptionGroups>,
  groupName: string,
) => {
  const group = optionGroups.find(
    (optionGroup) => optionGroup.name.toLowerCase() === groupName.toLowerCase(),
  );

  return group?.values || [];
};

const normalizeCustomProperties = (customProperties: unknown) =>
  isRecord(customProperties) ? { ...customProperties } : {};

const getTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : undefined;

const parseOptionalNumber = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  return parsed;
};

const parseOptionalInteger = (value: unknown, fieldName: string) => {
  const parsed = parseOptionalNumber(value, fieldName);

  if (parsed === undefined) {
    return undefined;
  }

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${fieldName} must be a whole number`);
  }

  return parsed;
};

const parseOptionalDate = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  return date;
};

const validateEventDateRange = (
  startingDate?: Date,
  endingDate?: Date,
) => {
  if (!startingDate) {
    throw new ValidationError("Event start date is required");
  }

  if (!endingDate) {
    throw new ValidationError("Event end date is required");
  }

  if (endingDate <= startingDate) {
    throw new ValidationError("Event end date must be after start date");
  }
};

const parseRequiredEventDate = (value: unknown, fieldName: string) => {
  const date = parseOptionalDate(value, fieldName);

  if (!date) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return date;
};

const getStringArray = (value: unknown) => normalizeStringList(value);

const getEditableStatus = (value: unknown) => {
  const status = getTrimmedString(value);

  if (!status) return undefined;

  if (!["Active", "Pending", "Draft"].includes(status)) {
    throw new ValidationError("Invalid product status");
  }

  return status;
};

const normalizeProductImages = (images: unknown) => {
  try {
    return normalizeImageAssetArray(images, {
      maxCount: 8,
      requireAtLeastOne: Array.isArray(images),
    });
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : "Invalid product images",
    );
  }
};

const normalizeShopImage = (image: unknown) => {
  if (image === undefined) return undefined;
  if (image === null) return null;

  if (typeof image === "string") {
    const url = image.trim();
    return url ? { url, fileId: "external-image" } : null;
  }

  if (Array.isArray(image)) {
    return normalizeImageAsset(image[0]);
  }

  return normalizeImageAsset(image);
};

const getSafeShopData = <T extends {
  id: string;
  name: string;
  bio: string | null;
  category: string;
  avatar: unknown;
  coverBanner: unknown;
  address: string;
  opening_hours: string | null;
  website: string | null;
  ratings: number;
  createdAt: Date;
  updatedAt: Date;
}>(shop: T) => ({
  id: shop.id,
  name: shop.name,
  bio: shop.bio,
  category: shop.category,
  avatar: shop.avatar,
  avatarUrl: getImageUrl(shop.avatar),
  coverBanner: shop.coverBanner,
  coverBannerUrl: getImageUrl(shop.coverBanner),
  address: shop.address,
  opening_hours: shop.opening_hours,
  website: shop.website,
  ratings: shop.ratings,
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt,
});

const sellerShopSettingsSelect = {
  id: true,
  name: true,
  bio: true,
  category: true,
  avatar: true,
  coverBanner: true,
  address: true,
  opening_hours: true,
  website: true,
  ratings: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.shopSelect;

const getValidWebsiteUrl = (value: unknown) => {
  const website = getTrimmedString(value);

  if (!website) return "";

  try {
    const url = new URL(website);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }

    return url.toString();
  } catch {
    throw new ValidationError("Website must be a valid URL");
  }
};

const normalizeOpeningHours = (value: unknown) => {
  if (value === undefined) return undefined;

  if (typeof value === "string") {
    return value.trim();
  }

  if (isRecord(value)) {
    return JSON.stringify(value);
  }

  return "";
};

const getSellerShop = async (req: Request) => {
  const role = (req as any).role;
  const sellerId = (req as any).user?.id;

  if (role !== "seller" || !sellerId) {
    throw new ValidationError("Seller account required");
  }

  const shop = await prisma.shop.findUnique({
    where: { sellerId },
    select: sellerShopSettingsSelect,
  });

  if (!shop) {
    throw new NotFoundError("Shop not found");
  }

  return shop;
};

export const getSellerShopSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);

    return res.status(200).json({
      success: true,
      shop: getSafeShopData(shop),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateSellerShopSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);

    if (!isRecord(req.body)) {
      throw new ValidationError("Shop update data is required");
    }

    const updateData: Prisma.shopUpdateInput = {};
    const name = getTrimmedString(req.body.name);
    const bio = getTrimmedString(req.body.bio);
    const category = getTrimmedString(req.body.category);
    const address = getTrimmedString(req.body.address);
    const website = getValidWebsiteUrl(req.body.website);
    const openingHours = normalizeOpeningHours(req.body.opening_hours);
    const avatar = normalizeShopImage(req.body.avatar);
    const coverBanner = normalizeShopImage(req.body.coverBanner);

    if ("name" in req.body) {
      if (!name) throw new ValidationError("Shop name is required");
      updateData.name = name;
    }

    if ("bio" in req.body) {
      updateData.bio = bio || null;
    }

    if ("category" in req.body) {
      if (!category) throw new ValidationError("Shop category is required");
      updateData.category = category;
    }

    if ("address" in req.body) {
      if (!address) throw new ValidationError("Shop address is required");
      updateData.address = address;
    }

    if ("website" in req.body) {
      updateData.website = website || null;
    }

    if ("opening_hours" in req.body) {
      updateData.opening_hours = openingHours || null;
    }

    if ("coverBanner" in req.body) {
      updateData.coverBanner = coverBanner;
    }

    if ("avatar" in req.body) {
      updateData.avatar = avatar;
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shop.id },
      data: updateData,
      select: sellerShopSettingsSelect,
    });

    return res.status(200).json({
      success: true,
      shop: getSafeShopData(updatedShop),
    });
  } catch (error) {
    return next(error);
  }
};

const getSellerOwnedProduct = async (productId: string, shopId: string) => {
  if (!isObjectIdLike(productId)) {
    throw new ValidationError("Invalid product ID");
  }

  const product = await prisma.products.findFirst({
    where: {
      id: productId,
      shopId,
    },
  });

  if (!product) {
    throw new NotFoundError("Product not found for this shop");
  }

  return product;
};

const getSafeProductUpdateData = async ({
  product,
  payload,
}: {
  product: Awaited<ReturnType<typeof getSellerOwnedProduct>>;
  payload: unknown;
}) => {
  if (!isRecord(payload)) {
    throw new ValidationError("Product update data is required");
  }

  const updateData: Prisma.productsUpdateInput = {};
  const title = getTrimmedString(payload.title);
  const slug = getTrimmedString(payload.slug);
  const category = getTrimmedString(payload.category);
  const subcategory =
    getTrimmedString(payload.subcategory) || getTrimmedString(payload.subCategory);
  const description =
    getTrimmedString(payload.description) ||
    getTrimmedString(payload.short_description);
  const detailedDescription = getTrimmedString(payload.detailed_description);
  const videoUrl = getTrimmedString(payload.video_url);
  const brand = getTrimmedString(payload.brand);
  const warranty = getTrimmedString(payload.warranty);
  const cashOnDelivery =
    getTrimmedString(payload.cash_on_delivery) ||
    getTrimmedString(payload.cashOnDelivery);
  const status = getEditableStatus(payload.status);
  const regularPrice = parseOptionalNumber(payload.regular_price, "Regular price");
  const salePrice = parseOptionalNumber(payload.sale_price, "Sale price");
  const stock = parseOptionalInteger(payload.stock, "Stock");
  const startingDate = parseOptionalDate(payload.starting_date, "Event start date");
  const endingDate = parseOptionalDate(payload.ending_date, "Event end date");
  const images = normalizeProductImages(payload.images);

  if (title !== undefined) {
    if (!title) throw new ValidationError("Title is required");
    updateData.title = title;
  }

  if (slug !== undefined) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ValidationError("Invalid slug format");
    }

    const existingProduct = await prisma.products.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingProduct && existingProduct.id !== product.id) {
      throw new ValidationError("Slug already exists");
    }

    updateData.slug = slug;
  }

  if (category !== undefined) {
    if (!category) throw new ValidationError("Category is required");
    updateData.category = category;
  }

  if (subcategory !== undefined) {
    if (!subcategory) throw new ValidationError("Subcategory is required");
    updateData.subCategory = subcategory;
  }

  if (description !== undefined) {
    if (!description) throw new ValidationError("Description is required");
    updateData.short_description = description;
  }

  if (detailedDescription !== undefined) {
    if (!detailedDescription) {
      throw new ValidationError("Detailed description is required");
    }

    updateData.detailed_description = detailedDescription;
  }

  if ("video_url" in payload) {
    updateData.video_url = videoUrl || null;
  }

  if ("brand" in payload) {
    updateData.brand = brand || null;
  }

  if ("warranty" in payload) {
    updateData.warranty = warranty || null;
  }

  if (cashOnDelivery !== undefined) {
    updateData.cashOnDelivery = cashOnDelivery;
  }

  if (regularPrice !== undefined) {
    if (regularPrice <= 0) {
      throw new ValidationError("Regular price must be greater than zero");
    }

    updateData.regular_price = regularPrice;
  }

  if (salePrice !== undefined) {
    if (salePrice < 0) {
      throw new ValidationError("Sale price cannot be negative");
    }

    const comparisonRegularPrice =
      regularPrice ?? Number(product.regular_price);

    if (salePrice > 0 && salePrice >= comparisonRegularPrice) {
      throw new ValidationError("Sale price must be less than regular price");
    }

    updateData.sale_price = salePrice;
  }

  if (stock !== undefined) {
    if (stock < 0) {
      throw new ValidationError("Stock cannot be negative");
    }

    updateData.stock = stock;
  }

  if (status !== undefined) {
    updateData.status = status as any;
  }

  if ("isEvent" in payload) {
    updateData.isEvent = payload.isEvent === true;
  }

  if ("starting_date" in payload || "ending_date" in payload) {
    const nextStartingDate = startingDate ?? product.starting_date ?? undefined;
    const nextEndingDate = endingDate ?? product.ending_date ?? undefined;

    validateEventDateRange(nextStartingDate, nextEndingDate);
    updateData.starting_date = nextStartingDate;
    updateData.ending_date = nextEndingDate;
  }

  if ("tags" in payload) {
    updateData.tags =
      typeof payload.tags === "string"
        ? payload.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => tag.toLowerCase())
        : getStringArray(payload.tags).map((tag) => tag.toLowerCase());
  }

  if ("discountCodes" in payload || "discount_codes" in payload) {
    updateData.discount_codes = getStringArray(
      "discountCodes" in payload ? payload.discountCodes : payload.discount_codes,
    );
  }

  if ("custom_specifications" in payload) {
    updateData.custom_specifications = payload.custom_specifications as Prisma.InputJsonValue;
  }

  if (
    "custom_properties" in payload ||
    "colors" in payload ||
    "sizes" in payload
  ) {
    const customPropertiesSource =
      "custom_properties" in payload
        ? payload.custom_properties
        : product.custom_properties;
    const normalizedCustomProperties = normalizeCustomProperties(
      customPropertiesSource,
    );
    const normalizedOptionGroups = normalizeProductOptionGroups(
      normalizedCustomProperties.optionGroups,
    );
    const optionGroupColors = getOptionGroupValues(
      normalizedOptionGroups,
      "Color",
    );
    const optionGroupSizes = getOptionGroupValues(
      normalizedOptionGroups,
      "Size",
    );

    updateData.colors =
      optionGroupColors.length > 0
        ? optionGroupColors
        : getStringArray(payload.colors);
    updateData.sizes =
      optionGroupSizes.length > 0
        ? optionGroupSizes
        : getStringArray(payload.sizes);
    updateData.custom_properties = {
      ...normalizedCustomProperties,
      optionGroups: normalizedOptionGroups,
    };
  }

  if (images) {
    updateData.images = images;
  }

  return {
    updateData,
    nextImages: images,
  };
};

const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

const getPagination = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const getPublicProductOrderBy = (
  sort?: string,
): Prisma.productsOrderByWithRelationInput => {
  switch (sort) {
    case "latest":
      return { createdAt: "desc" };
    case "price_low":
      return { sale_price: "asc" };
    case "price_high":
      return { sale_price: "desc" };
    case "popular":
    default:
      return { totalSales: "desc" };
  }
};

const getSellerProductStatusFilter = (status?: string) => {
  switch ((status || "").trim().toLowerCase()) {
    case "active":
      return { isDeleted: false, status: "Active" as const };
    case "pending":
      return { isDeleted: false, status: "Pending" as const };
    case "draft":
    case "inactive":
      return { isDeleted: false, status: "Draft" as const };
    case "archived":
    case "deleted":
      return { isDeleted: true };
    default:
      return { isDeleted: false };
  }
};

const applySellerProductStockFilter = (
  where: Prisma.productsWhereInput,
  stockState?: string,
) => {
  switch ((stockState || "").trim().toLowerCase()) {
    case "in-stock":
    case "in_stock":
      where.stock = { gt: 5 };
      break;
    case "low-stock":
    case "low_stock":
      where.stock = { gt: 0, lte: 5 };
      break;
    case "out-of-stock":
    case "out_of_stock":
      where.stock = { lte: 0 };
      break;
  }
};

const getSellerProductOrderBy = (
  sort?: string,
): Prisma.productsOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "price-low":
    case "price_low":
      return { sale_price: "asc" };
    case "price-high":
    case "price_high":
      return { sale_price: "desc" };
    case "stock-low":
    case "stock_low":
      return { stock: "asc" };
    case "stock-high":
    case "stock_high":
      return { stock: "desc" };
    case "name-az":
    case "name_az":
      return { title: "asc" };
    case "name-za":
    case "name_za":
      return { title: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
};

const publicProductInclude = {
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
} satisfies Prisma.productsInclude;

const publicProductDetailInclude = {
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
} satisfies Prisma.productsInclude;

type ProductPricingSerializable = {
  regular_price?: number | null;
  sale_price?: number | null;
  event_sale_price?: number | null;
  isEvent?: boolean | null;
  starting_date?: Date | string | null;
  ending_date?: Date | string | null;
};

const withEffectivePricingMetadata = <T extends ProductPricingSerializable>(
  product: T,
) => {
  const pricing = getProductEffectivePricing(product);

  return {
    ...product,
    event_sale_price: pricing.eventSalePrice,
    effective_price: pricing.effectivePrice,
    active_price_source: pricing.activePriceSource,
    event_status: pricing.eventStatus,
  };
};

const withEffectivePricingMetadataList = <T extends ProductPricingSerializable>(
  products: T[],
) => products.map(withEffectivePricingMetadata);

const getNormalBuyingPriceForValidation = (
  product: ProductPricingSerializable,
) => getProductEffectivePricing({ ...product, isEvent: false }).normalSalePrice;

const getValidatedEventSalePrice = (
  value: unknown,
  product: ProductPricingSerializable,
) => {
  try {
    return validateEventSalePrice(
      value,
      getNormalBuyingPriceForValidation(product),
    );
  } catch (error) {
    throw new ValidationError(
      error instanceof Error
        ? error.message
        : "Event special price is invalid",
    );
  }
};

const publicShopSelect = {
  id: true,
  name: true,
  bio: true,
  category: true,
  ratings: true,
  reviewCount: true,
  avatar: true,
  coverBanner: true,
  address: true,
  website: true,
  opening_hours: true,
  createdAt: true,
  _count: {
    select: {
      products: true,
    },
  },
} satisfies Prisma.shopSelect;

const getPublicShopProductsWhere = (shopId: string): Prisma.productsWhereInput => ({
  shopId,
  isDeleted: false,
  status: "Active",
});

type PublicEventStatusFilter = "all" | "active" | "upcoming" | "ended";

const getPublicEventStatusFilter = (
  status?: string,
): PublicEventStatusFilter => {
  const normalized = (status || "").trim().toLowerCase();

  if (normalized === "upcoming") return "upcoming";
  if (normalized === "active") return "active";
  if (normalized === "ended" || normalized === "expired") return "ended";

  return "all";
};

const getActivePublicEventWhere = (now: Date): Prisma.productsWhereInput => ({
  AND: [
    {
      OR: [
        { starting_date: { lte: now } },
        { starting_date: null },
        { starting_date: { isSet: false } },
      ],
    },
    {
      OR: [
        { ending_date: { gte: now } },
        { ending_date: null },
        { ending_date: { isSet: false } },
      ],
    },
  ],
});

const getUpcomingPublicEventWhere = (now: Date): Prisma.productsWhereInput => ({
  AND: [
    {
      starting_date: {
        gt: now,
      },
    },
    {
      OR: [
        { ending_date: { gte: now } },
        { ending_date: null },
        { ending_date: { isSet: false } },
      ],
    },
  ],
});

const getPublicEventProductsWhere = (
  shopId?: string,
  rawStatus?: string,
) => {
  const now = new Date();
  const eventStatus = getPublicEventStatusFilter(rawStatus);
  const where: Prisma.productsWhereInput = {
    ...(shopId ? getPublicShopProductsWhere(shopId) : {
      isDeleted: false,
      status: "Active" as const,
    }),
    isEvent: true,
  };
  let orderBy: Prisma.productsOrderByWithRelationInput = {
    createdAt: "desc",
  };

  if (eventStatus === "upcoming") {
    Object.assign(where, getUpcomingPublicEventWhere(now));
    orderBy = {
      starting_date: "asc",
    };
  } else if (eventStatus === "ended") {
    where.ending_date = {
      lt: now,
    };
    orderBy = {
      ending_date: "desc",
    };
  } else if (eventStatus === "active") {
    Object.assign(where, getActivePublicEventWhere(now));
    orderBy = {
      ending_date: "asc",
    };
  } else {
    where.OR = [
      getActivePublicEventWhere(now),
      getUpcomingPublicEventWhere(now),
    ];
    orderBy = {
      starting_date: "asc",
    };
  }

  return { where, orderBy };
};

const getUtcDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getRecentUtcDateKeys = (days: number) => {
  const today = new Date();
  const start = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() - (days - 1 - index));
    return getUtcDateKey(date);
  });
};

// get product category
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const config = await prisma.site_configs.findFirst();

    if (!config) {
      return res.status(404).json({ message: "Categories not found" });
    }
    return res.status(200).json({
      categories: config.categories,
      subCategories: config.subCategories,
    });
  } catch (error) {
    return next(error);
  }
};

// get all public products
export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 20), 50);
    const type = getQueryString(req.query.type);
    const category = getQueryString(req.query.category);
    const subCategory = getQueryString(req.query.subCategory);
    const excludeSlug = getQueryString(req.query.excludeSlug);
    const excludeProductId = getQueryString(req.query.excludeProductId);
    const skip = (page - 1) * limit;

    const baseFilter: Prisma.productsWhereInput = {
      OR: [
        { starting_date: null },
        { starting_date: { isSet: false } },
        { ending_date: null },
        { ending_date: { isSet: false } },
      ],
      isDeleted: false,
      status: "Active",
    };

    if (category) {
      baseFilter.category = category;
    }

    if (subCategory) {
      baseFilter.subCategory = subCategory;
    }

    if (excludeSlug) {
      baseFilter.slug = {
        not: excludeSlug,
      };
    }

    if (excludeProductId) {
      if (isObjectIdLike(excludeProductId)) {
        baseFilter.id = {
          not: excludeProductId,
        };
      }
    }

    const orderBy: Prisma.productsOrderByWithRelationInput =
      type === "latest" ? getPublicProductOrderBy("latest") : getPublicProductOrderBy("popular");

    const [products, total, top10Products] = await Promise.all([
      prisma.products.findMany({
        where: baseFilter,
        include: publicProductInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.products.count({
        where: baseFilter,
      }),
      prisma.products.findMany({
        where: baseFilter,
        include: publicProductInclude,
        orderBy: {
          totalSales: "desc",
        },
        take: 10,
      }),
    ]);

    return res.status(200).json({
      success: true,
      products: withEffectivePricingMetadataList(products),
      pagination: getPagination(total, page, limit),
      top10Products: withEffectivePricingMetadataList(top10Products),
    });
  } catch (error) {
    return next(error);
  }
};

// get public product detail by slug
export const getProductDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Product slug is required",
      });
    }

    const product = await prisma.products.findFirst({
      where: {
        slug,
        isDeleted: false,
        status: "Active",
      },
      include: publicProductDetailInclude,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: withEffectivePricingMetadata(product),
    });
  } catch (error) {
    return next(error);
  }
};

// get public review summary for one product
export const getProductReviewSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { productId } = req.params;

    if (!productId || !isObjectIdLike(productId)) {
      throw new ValidationError("Invalid product ID");
    }

    const product = await prisma.products.findFirst({
      where: {
        id: productId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const summary = await getProductReviewSummary(productId);

    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    return next(error);
  }
};

// get published public reviews for one product
export const getProductReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { productId } = req.params;
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);

    if (!productId || !isObjectIdLike(productId)) {
      throw new ValidationError("Invalid product ID");
    }

    const product = await prisma.products.findFirst({
      where: {
        id: productId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const result = await getPublicProductReviews({
      productId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

// check whether the current customer can review a product
export const getReviewEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const productId = getQueryString(req.query.productId);
    await getReviewableProduct(productId || "");

    const orderEntries = await getCustomerProductOrderItems(userId, productId!);
    const orderItemIds = orderEntries.map((entry) => entry.orderItem.id);
    const reviews =
      orderItemIds.length > 0
        ? await prisma.productReview.findMany({
            where: {
              orderItemId: {
                in: orderItemIds,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : [];
    const reviewedOrderItemIds = new Set(
      reviews.map((review) => review.orderItemId),
    );
    const visibleExistingReviews = reviews.filter(
      (review) => review.status !== "Deleted" && !review.deletedAt,
    );
    const deliveredPaidEntries = orderEntries.filter((entry) =>
      isDeliveredPaidOrder(entry.order),
    );
    const eligibleOrderItems = deliveredPaidEntries
      .filter((entry) => !reviewedOrderItemIds.has(entry.orderItem.id))
      .map((entry) => ({
        orderId: entry.order.id,
        orderItemId: entry.orderItem.id,
        productId: entry.orderItem.productId,
        purchasedAt: entry.order.createdAt,
        deliveredAt: getDeliveredAt(entry.order),
      }));
    const reason =
      eligibleOrderItems.length > 0
        ? undefined
        : orderEntries.length === 0
          ? "Product has not been purchased by this customer."
          : deliveredPaidEntries.length === 0
            ? "Order must be paid and delivered before review."
            : "All eligible purchases for this product already have reviews.";

    return res.status(200).json({
      success: true,
      eligible: eligibleOrderItems.length > 0,
      reason,
      eligibleOrderItems,
      existingReviews: visibleExistingReviews.map(getSafeReviewPayload),
    });
  } catch (error) {
    return next(error);
  }
};

// load one review request for the authenticated customer
export const getReviewRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const code = getTrimmedString(req.params.code);

    if (!code) {
      throw new ValidationError("Review request code is required");
    }

    const request = await getReviewRequestByCode(code, userId);
    const context = await getReviewRequestContext(request);
    const state = await getReviewRequestState(request, context);

    return res.status(200).json({
      success: true,
      request: serializeReviewRequestContext({
        request,
        context,
        state,
      }),
    });
  } catch (error) {
    return next(error);
  }
};

// submit a verified-purchase review through a one-time review request
export const submitReviewRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const code = getTrimmedString(req.params.code);
    const payload = isRecord(req.body) ? req.body : {};

    if (!code) {
      throw new ValidationError("Review request code is required");
    }

    const request = await getReviewRequestByCode(code, userId);
    const context = await getReviewRequestContext(request);
    const state = await getReviewRequestState(request, context);

    if (!state.canSubmit) {
      const statusCode = state.status === "Expired" ? 410 : 409;

      return res.status(statusCode).json({
        success: false,
        message: state.reason || "Review request cannot be used",
        request: serializeReviewRequestContext({
          request,
          context,
          state,
        }),
      });
    }

    if (!context.product || !context.order || !context.orderItem) {
      throw new ValidationError("Review request is missing required context");
    }

    const rating = assertValidReviewRating(payload.rating);
    const title = sanitizeReviewTitle(payload.title);
    const comment = sanitizeReviewComment(payload.comment);
    const review = await prisma.productReview.create({
      data: {
        productId: request.productId,
        userId: request.userId,
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        sellerId: request.sellerId,
        shopId: request.shopId,
        rating,
        title,
        comment,
        status: "Published",
      },
    });

    await prisma.reviewRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: "Used",
        usedAt: new Date(),
        reviewId: review.id,
      },
    });

    const [productSummary, shopSummary] = await Promise.all([
      recalculateProductRating(request.productId),
      recalculateShopRating(request.shopId),
    ]);

    publishNewReviewNotification({
      reviewId: review.id,
      sellerId: request.sellerId,
      productId: request.productId,
      productName: context.product?.title || context.orderItem.title,
      shopId: request.shopId,
      rating,
    });

    return res.status(201).json({
      success: true,
      review: getSafeReviewPayload(review),
      summary: productSummary,
      productSummary,
      shopSummary,
    });
  } catch (error: any) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({
        success: false,
        message: "This order item already has a review",
      });
    }

    return next(error);
  }
};

// create a verified-purchase product review
// TODO: Future UI should use the review request submit flow instead.
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const payload = isRecord(req.body) ? req.body : {};
    const productId = getTrimmedString(payload.productId);
    const orderItemId = getTrimmedString(payload.orderItemId);
    const product = await getReviewableProduct(productId || "");

    if (!orderItemId || !isObjectIdLike(orderItemId)) {
      throw new ValidationError("Invalid order item ID");
    }

    const rating = assertValidReviewRating(payload.rating);
    const title = sanitizeReviewTitle(payload.title);
    const comment = sanitizeReviewComment(payload.comment);
    const orderEntries = await getCustomerProductOrderItems(userId, product.id);
    const matchingEntry = orderEntries.find(
      (entry) => entry.orderItem.id === orderItemId,
    );

    if (!matchingEntry) {
      throw new NotFoundError("Order item not found for this product");
    }

    if (!isDeliveredPaidOrder(matchingEntry.order)) {
      throw new ForbiddenError("Order must be paid and delivered before review");
    }

    const existingReview = await prisma.productReview.findUnique({
      where: { orderItemId },
      select: { id: true },
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "This order item already has a review",
      });
    }

    const review = await prisma.productReview.create({
      data: {
        productId: product.id,
        userId,
        orderId: matchingEntry.order.id,
        orderItemId,
        sellerId: product.shop.sellerId,
        shopId: product.shopId,
        rating,
        title,
        comment,
      },
    });
    const [productSummary, shopSummary] = await Promise.all([
      recalculateProductRating(product.id),
      recalculateShopRating(product.shopId),
    ]);

    publishNewReviewNotification({
      reviewId: review.id,
      sellerId: product.shop.sellerId,
      productId: product.id,
      productName: product.title,
      shopId: product.shopId,
      rating,
    });

    return res.status(201).json({
      success: true,
      review: getSafeReviewPayload(review),
      productSummary,
      shopSummary,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This order item already has a review",
      });
    }

    return next(error);
  }
};

// update the current customer's own review
export const updateMyReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const { reviewId } = req.params;
    const payload = isRecord(req.body) ? req.body : {};

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        userId,
      },
    });

    if (!review || review.status === "Deleted" || review.deletedAt) {
      throw new NotFoundError("Review not found");
    }

    if (review.status === "Hidden") {
      throw new ForbiddenError("Hidden reviews cannot be edited");
    }

    const updateData: Prisma.productReviewUpdateInput = {};

    if ("rating" in payload) {
      updateData.rating = assertValidReviewRating(payload.rating);
    }

    if ("title" in payload) {
      updateData.title = sanitizeReviewTitle(payload.title) || null;
    }

    if ("comment" in payload) {
      updateData.comment = sanitizeReviewComment(payload.comment) || null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No review changes provided");
    }

    const updated = await prisma.productReview.update({
      where: { id: review.id },
      data: updateData,
    });
    const [productSummary, shopSummary] = await Promise.all([
      recalculateProductRating(updated.productId),
      recalculateShopRating(updated.shopId),
    ]);

    return res.status(200).json({
      success: true,
      review: getSafeReviewPayload(updated),
      productSummary,
      shopSummary,
    });
  } catch (error) {
    return next(error);
  }
};

// soft-delete the current customer's own review
export const deleteMyReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const { reviewId } = req.params;

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        userId,
      },
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
    const [productSummary, shopSummary] = await Promise.all([
      recalculateProductRating(deleted.productId),
      recalculateShopRating(deleted.shopId),
    ]);

    return res.status(200).json({
      success: true,
      message: "Review deleted",
      productSummary,
      shopSummary,
    });
  } catch (error) {
    return next(error);
  }
};

// list the current customer's reviews
export const getMyReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getAuthenticatedCustomerId(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const status = getQueryString(req.query.status);
    const skip = (page - 1) * limit;
    const where: Prisma.productReviewWhereInput = { userId };

    if (status === "Deleted") {
      where.status = "Deleted";
    } else {
      where.status = {
        not: "Deleted",
      };
      where.OR = [
        {
          deletedAt: null,
        },
        {
          deletedAt: {
            isSet: false,
          },
        },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.productReview.count({ where }),
    ]);
    const productIds = [...new Set(reviews.map((review) => review.productId))];
    const products =
      productIds.length > 0
        ? await prisma.products.findMany({
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
          })
        : [];
    const productsById = new Map(products.map((product) => [product.id, product]));

    return res.status(200).json({
      success: true,
      reviews: reviews.map((review) => ({
        ...getSafeReviewPayload(review),
        productId: review.productId,
        orderId: review.orderId,
        product: productsById.get(review.productId) || null,
      })),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

const getSellerReviewDate = (value: unknown, endOfDay = false) => {
  const rawValue = getQueryString(value);

  if (!rawValue) return undefined;

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) return undefined;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const getSellerReviewOrderBy = (
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

const getVisibleSellerReviewFilter = (): Prisma.productReviewWhereInput => ({
  status: {
    not: "Deleted",
  },
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

const getSellerReviewProductImage = (product?: { images?: any } | null) => {
  return getProductThumbnail(product);
};

const getSellerReviewUserAvatar = (user?: { avatar?: any } | null) => {
  if (typeof user?.avatar === "string") return user.avatar;

  return getImageUrl(user?.avatar);
};

const getSellerReviewSummary = async (sellerId: string) => {
  const reviews = await prisma.productReview.findMany({
    where: {
      sellerId,
      ...getVisibleSellerReviewFilter(),
    },
    select: {
      rating: true,
      sellerReply: true,
      reportedAt: true,
    },
  });
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingDistribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  });

  return {
    totalReviews: reviews.length,
    averageRating:
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length) *
              10,
          ) / 10
        : 0,
    ratingDistribution,
    unrepliedCount: reviews.filter((review) => !review.sellerReply).length,
    reportedCount: reviews.filter((review) => Boolean(review.reportedAt)).length,
  };
};

const getSellerReviewSearchFilters = async ({
  q,
  shopId,
}: {
  q?: string;
  shopId: string;
}) => {
  const query = (q || "").trim();

  if (!query) return [];

  const [products, users] = await Promise.all([
    prisma.products.findMany({
      where: {
        shopId,
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
      take: 50,
    }),
    prisma.user.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
      take: 50,
    }),
  ]);
  const filters: Prisma.productReviewWhereInput[] = [
    {
      title: {
        contains: query,
        mode: "insensitive",
      },
    },
    {
      comment: {
        contains: query,
        mode: "insensitive",
      },
    },
  ];

  if (products.length > 0) {
    filters.push({
      productId: {
        in: products.map((product) => product.id),
      },
    });
  }

  if (users.length > 0) {
    filters.push({
      userId: {
        in: users.map((user) => user.id),
      },
    });
  }

  return filters;
};

export const getSellerReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const sellerId = (req as any).user.id as string;
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const rating = getOptionalNumber(req.query.rating);
    const status = getQueryString(req.query.status);
    const productId = getQueryString(req.query.productId);
    const q = getQueryString(req.query.q);
    const dateFrom = getSellerReviewDate(req.query.dateFrom);
    const dateTo = getSellerReviewDate(req.query.dateTo, true);
    const sort = getQueryString(req.query.sort);
    const skip = (page - 1) * limit;
    const andFilters: Prisma.productReviewWhereInput[] = [
      {
        sellerId,
      },
      getVisibleSellerReviewFilter(),
    ];

    if (rating && Number.isInteger(rating) && rating >= 1 && rating <= 5) {
      andFilters.push({ rating });
    }

    if (status && status !== "all") {
      if (status === "Reported") {
        andFilters.push({
          reportedAt: {
            not: null,
          },
        });
      } else {
        andFilters.push({
          status: status as any,
        });
      }
    }

    if (productId && productId !== "all") {
      if (!isObjectIdLike(productId)) {
        throw new ValidationError("Invalid product ID");
      }

      await getSellerOwnedProduct(productId, shop.id);
      andFilters.push({ productId });
    }

    if (dateFrom || dateTo) {
      andFilters.push({
        createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      });
    }

    const searchFilters = await getSellerReviewSearchFilters({
      q,
      shopId: shop.id,
    });

    if (searchFilters.length > 0) {
      andFilters.push({
        OR: searchFilters,
      });
    }

    const where: Prisma.productReviewWhereInput = {
      AND: andFilters,
    };
    const [reviews, total, summary] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: getSellerReviewOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.productReview.count({ where }),
      getSellerReviewSummary(sellerId),
    ]);
    const productIds = [...new Set(reviews.map((review) => review.productId))];
    const userIds = [...new Set(reviews.map((review) => review.userId))];
    const [products, users] = await Promise.all([
      productIds.length > 0
        ? prisma.products.findMany({
            where: {
              id: {
                in: productIds,
              },
              shopId: shop.id,
            },
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
          })
        : [],
    ]);
    const productById = new Map(products.map((product) => [product.id, product]));
    const userById = new Map(users.map((user) => [user.id, user]));
    const pagination = getPagination(total, page, limit);

    return res.status(200).json({
      success: true,
      reviews: reviews.map((review) => {
        const product = productById.get(review.productId);
        const user = userById.get(review.userId);

        return {
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          status: review.status,
          sellerReply: review.sellerReply,
          repliedAt: review.repliedAt?.toISOString() || null,
          reportedAt: review.reportedAt?.toISOString() || null,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
          user: user
            ? {
                id: user.id,
                name: user.name,
                avatar: getSellerReviewUserAvatar(user),
              }
            : null,
          product: product
            ? {
                id: product.id,
                title: product.title,
                name: product.title,
                slug: product.slug,
                image: getSellerReviewProductImage(product),
              }
            : null,
        };
      }),
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

export const replyToSellerReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await getSellerShop(req);
    const sellerId = (req as any).user.id as string;
    const { reviewId } = req.params;
    const payload = isRecord(req.body) ? req.body : {};

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    const reply = sanitizeReviewText(payload.reply, {
      fieldName: "Seller reply",
      maxLength: 1000,
      required: true,
    });
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        sellerId,
      },
    });

    if (!review || review.status === "Deleted" || review.deletedAt) {
      throw new NotFoundError("Review not found");
    }

    const updated = await prisma.productReview.update({
      where: {
        id: review.id,
      },
      data: {
        sellerReply: reply,
        repliedAt: new Date(),
      },
    });
    const product = await prisma.products.findUnique({
      where: {
        id: updated.productId,
      },
      select: {
        title: true,
      },
    });

    if (updated.repliedAt) {
      publishReviewReplyNotification({
        reviewId: updated.id,
        userId: updated.userId,
        sellerId: updated.sellerId,
        productId: updated.productId,
        productName: product?.title || "your product",
        shopId: updated.shopId,
        rating: updated.rating,
        repliedAt: updated.repliedAt,
      });
    }

    return res.status(200).json({
      success: true,
      review: {
        id: updated.id,
        sellerReply: updated.sellerReply,
        repliedAt: updated.repliedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const reportSellerReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await getSellerShop(req);
    const sellerId = (req as any).user.id as string;
    const { reviewId } = req.params;

    if (!reviewId || !isObjectIdLike(reviewId)) {
      throw new ValidationError("Invalid review ID");
    }

    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        sellerId,
      },
    });

    if (!review || review.status === "Deleted" || review.deletedAt) {
      throw new NotFoundError("Review not found");
    }

    const updated = await prisma.productReview.update({
      where: {
        id: review.id,
      },
      data: {
        reportedAt: review.reportedAt || new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      review: {
        id: updated.id,
        reportedAt: updated.reportedAt?.toISOString() || null,
      },
      message: "Review reported for admin moderation",
    });
  } catch (error) {
    return next(error);
  }
};

// get public products with filters
export const getFilteredProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 12), 50);
    const skip = (page - 1) * limit;
    const category = getQueryString(req.query.category);
    const subCategory = getQueryString(req.query.subCategory);
    const brand = getQueryString(req.query.brand);
    const color = getQueryString(req.query.color);
    const size = getQueryString(req.query.size);
    const sort = getQueryString(req.query.sort);
    const excludeSlug = getQueryString(req.query.excludeSlug);
    const excludeProductId = getQueryString(req.query.excludeProductId);
    const minPrice = getOptionalNumber(req.query.minPrice);
    const maxPrice = getOptionalNumber(req.query.maxPrice);
    const rating = getOptionalNumber(req.query.rating);

    const where: Prisma.productsWhereInput = {
      isDeleted: false,
      status: "Active",
    };

    if (category) {
      where.category = category;
    }

    if (subCategory) {
      where.subCategory = subCategory;
    }

    if (brand) {
      where.brand = brand;
    }

    if (typeof minPrice === "number" || typeof maxPrice === "number") {
      const salePriceFilter: Prisma.FloatFilter<"products"> = {};

      if (typeof minPrice === "number" && minPrice >= 0) {
        salePriceFilter.gte = minPrice;
      }

      if (typeof maxPrice === "number" && maxPrice >= 0) {
        salePriceFilter.lte = maxPrice;
      }

      where.sale_price = salePriceFilter;
    }

    if (typeof rating === "number" && rating >= 0) {
      where.ratings = {
        gte: rating,
      };
    }

    if (color) {
      where.colors = {
        has: color,
      };
    }

    if (size) {
      where.sizes = {
        has: size,
      };
    }

    if (excludeSlug) {
      where.slug = {
        not: excludeSlug,
      };
    }

    if (excludeProductId && isObjectIdLike(excludeProductId)) {
      where.id = {
        not: excludeProductId,
      };
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        include: publicProductInclude,
        orderBy: getPublicProductOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      products: withEffectivePricingMetadataList(products),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

// search public products
export const searchProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawQuery = getQueryString(req.query.q) || "";
    const query = rawQuery.trim();
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 12), 50);
    const category = getQueryString(req.query.category);
    const sort = getQueryString(req.query.sort);
    const skip = (page - 1) * limit;

    if (!query) {
      return res.status(200).json({
        success: true,
        products: [],
        pagination: getPagination(0, page, limit),
        query,
      });
    }

    const where: Prisma.productsWhereInput = {
      isDeleted: false,
      status: "Active",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { short_description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { subCategory: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
      ],
    };

    if (category) {
      where.category = category;
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        include: publicProductInclude,
        orderBy: getPublicProductOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      products: withEffectivePricingMetadataList(products),
      pagination: getPagination(total, page, limit),
      query,
    });
  } catch (error) {
    return next(error);
  }
};

// get public event or offer products
export const getEventProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 12), 50);
    const category = getQueryString(req.query.category);
    const subCategory = getQueryString(req.query.subCategory);
    const eventStatus = getQueryString(req.query.status);
    const skip = (page - 1) * limit;
    const { where, orderBy } = getPublicEventProductsWhere(
      undefined,
      eventStatus,
    );

    if (category) {
      where.category = category;
    }

    if (subCategory) {
      where.subCategory = subCategory;
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        include: publicProductInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      products: withEffectivePricingMetadataList(products),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

// get public top shops using product totalSales as a temporary sales score
export const getTopShops = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 20);
    const category = getQueryString(req.query.category);

    const where: Prisma.productsWhereInput = {
      isDeleted: false,
      status: "Active",
    };

    if (category) {
      where.category = category;
    }

    const products = await prisma.products.findMany({
      where,
      select: {
        shopId: true,
        totalSales: true,
      },
    });

    const shopStats = new Map<
      string,
      {
        salesScore: number;
        productCount: number;
      }
    >();

    products.forEach((product) => {
      const current = shopStats.get(product.shopId) || {
        salesScore: 0,
        productCount: 0,
      };

      shopStats.set(product.shopId, {
        salesScore: current.salesScore + (product.totalSales || 0),
        productCount: current.productCount + 1,
      });
    });

    const rankedShops = Array.from(shopStats.entries())
      .map(([shopId, stats]) => ({
        shopId,
        ...stats,
      }))
      .sort(
        (a, b) =>
          b.salesScore - a.salesScore || b.productCount - a.productCount,
      )
      .slice(0, limit);

    if (rankedShops.length === 0) {
      return res.status(200).json({
        success: true,
        shops: [],
      });
    }

    const shops = await prisma.shop.findMany({
      where: {
        id: {
          in: rankedShops.map((shop) => shop.shopId),
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
        ratings: true,
        avatar: true,
        coverBanner: true,
        address: true,
        createdAt: true,
      },
    });
    const shopById = new Map(shops.map((shop) => [shop.id, shop]));
    const topShops = rankedShops.flatMap((rankedShop) => {
      const shop = shopById.get(rankedShop.shopId);

      if (!shop) {
        return [];
      }

      return [
        {
          ...shop,
          salesScore: rankedShop.salesScore,
          productCount: rankedShop.productCount,
        },
      ];
    });

    return res.status(200).json({
      success: true,
      shops: topShops,
    });
  } catch (error) {
    return next(error);
  }
};

// get public shops
export const getShops = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 24), 50);
    const category = getQueryString(req.query.category);
    const rawQuery = getQueryString(req.query.q) || "";
    const query = rawQuery.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.shopWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { bio: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
      ];
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        select: publicShopSelect,
        orderBy: [{ ratings: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.shop.count({ where }),
    ]);

    const publicShops = shops.map(({ _count, ...shop }) => ({
      ...shop,
      productCount: _count.products,
    }));

    return res.status(200).json({
      success: true,
      shops: publicShops,
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

// get public shop detail
export const getShopDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { shopId } = req.params;

    if (!shopId || !isObjectIdLike(shopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop id",
      });
    }

    const [shop, productCount] = await Promise.all([
      prisma.shop.findUnique({
        where: {
          id: shopId,
        },
        select: publicShopSelect,
      }),
      prisma.products.count({
        where: getPublicShopProductsWhere(shopId),
      }),
    ]);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        bio: shop.bio,
        category: shop.category,
        ratings: shop.ratings,
        reviewCount: shop.reviewCount,
        avatar: shop.avatar,
        coverBanner: shop.coverBanner,
        address: shop.address,
        website: shop.website,
        opening_hours: shop.opening_hours,
        createdAt: shop.createdAt,
        productCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// get public review summary for one shop from its product reviews
export const getShopReviewSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { shopId } = req.params;

    if (!shopId || !isObjectIdLike(shopId)) {
      throw new ValidationError("Invalid shop ID");
    }

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
      select: {
        id: true,
      },
    });

    if (!shop) {
      throw new NotFoundError("Shop not found");
    }

    const summary = await getShopReviewSummary(shopId);

    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    return next(error);
  }
};

// get published public reviews for one shop from its product reviews
export const getShopReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { shopId } = req.params;
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);

    if (!shopId || !isObjectIdLike(shopId)) {
      throw new ValidationError("Invalid shop ID");
    }

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
      select: {
        id: true,
      },
    });

    if (!shop) {
      throw new NotFoundError("Shop not found");
    }

    const result = await getPublicShopReviews({
      shopId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

// get public active products for one shop
export const getPublicShopProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { shopId } = req.params;

    if (!shopId || !isObjectIdLike(shopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop id",
      });
    }

    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 12), 50);
    const sort = getQueryString(req.query.sort);
    const skip = (page - 1) * limit;
    const where = getPublicShopProductsWhere(shopId);

    const [shopExists, products, total] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true },
      }),
      prisma.products.findMany({
        where,
        include: publicProductInclude,
        orderBy: getPublicProductOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);

    if (!shopExists) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      products: withEffectivePricingMetadataList(products),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

// get public event or offer products for one shop
export const getPublicShopEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { shopId } = req.params;

    if (!shopId || !isObjectIdLike(shopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop id",
      });
    }

    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 12), 50);
    const eventStatus = getQueryString(req.query.status) || "active";
    const skip = (page - 1) * limit;
    const { where, orderBy } = getPublicEventProductsWhere(
      shopId,
      eventStatus,
    );

    const [shopExists, products, total] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true },
      }),
      prisma.products.findMany({
        where,
        include: publicProductInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);

    if (!shopExists) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      products: withEffectivePricingMetadataList(products),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

// get visit analytics for the authenticated seller's own shop
export const getSellerShopAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const dateKeys = getRecentUtcDateKeys(14);
    const [analytics, dailyRows] = await Promise.all([
      prisma.shopAnalytics.findUnique({
        where: {
          shopId: shop.id,
        },
      }),
      prisma.shopDailyAnalytics.findMany({
        where: {
          shopId: shop.id,
          date: {
            in: dateKeys,
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
    ]);
    const dailyByDate = new Map(dailyRows.map((row) => [row.date, row]));
    const daily = dateKeys.map((date) => {
      const row = dailyByDate.get(date);

      return {
        date,
        totalVisits: row?.totalVisits || 0,
        loggedInVisits: row?.loggedInVisits || 0,
        guestVisits: row?.guestVisits || 0,
      };
    });

    return res.status(200).json({
      success: true,
      analytics: {
        shopId: shop.id,
        totalVisits: analytics?.totalVisits || 0,
        loggedInVisits: analytics?.loggedInVisits || 0,
        guestVisits: analytics?.guestVisits || 0,
        lastVisitedAt: analytics?.lastVisitedAt || null,
        daily,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateSellerOwnedProduct = async ({
  req,
  productId,
  payload,
}: {
  req: Request;
  productId: string;
  payload: unknown;
}) => {
  const shop = await getSellerShop(req);
  const product = await getSellerOwnedProduct(productId, shop.id);
  const { updateData, nextImages } = await getSafeProductUpdateData({
    product,
    payload,
  });
  const removedImageFileIds = nextImages
    ? product.images
        .filter(
          (image) =>
            !nextImages.some((nextImage) => nextImage.fileId === image.fileId),
        )
        .map((image) => image.fileId)
    : [];

  const updated = await prisma.products.update({
    where: { id: product.id },
    data: updateData,
  });

  if (removedImageFileIds.length > 0) {
    await Promise.all(
      removedImageFileIds.map(async (fileId) => {
        try {
          await imagekit.files.delete(fileId);
        } catch (error) {
          console.error(`Failed to delete removed image ${fileId}`, error);
        }
      }),
    );
  }

  return updated;
};

// get one seller-owned product for management/editing
export const getSellerProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const productId = req.params.id;
    const shop = await getSellerShop(req);
    const product = await getSellerOwnedProduct(productId, shop.id);

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return next(error);
  }
};

// update one seller-owned product with an allowlisted payload
export const updateSellerProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updated = await updateSellerOwnedProduct({
      req,
      productId: req.params.id,
      payload: req.body,
    });

    return res.status(200).json({ success: true, product: updated });
  } catch (error) {
    return next(error);
  }
};

// update product - kept for older seller-ui callers, but now uses safe allowlist
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, data } = req.body || {};

    if (!id || !data) {
      throw new ValidationError("Product id and data are required");
    }

    const updated = await updateSellerOwnedProduct({
      req,
      productId: id,
      payload: data,
    });

    return res.status(200).json({ success: true, product: updated });
  } catch (error) {
    return next(error);
  }
};

// delete (soft) product
export const deleteProduct = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Product id is required" });
    }

    const shop = await prisma.shop.findUnique({ where: { sellerId } });
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const product = await prisma.products.findUnique({ where: { id } });
    if (!product || product.shopId !== shop.id) {
      return res
        .status(404)
        .json({ message: "Product not found for this shop" });
    }

    await prisma.products.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    return next(error);
  }
};

// restore deleted product within 24 hours
export const restoreProduct = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      throw new ValidationError("Product ID is required");
    }

    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    if (product.shop.sellerId !== sellerId) {
      throw new ValidationError("Unauthorized access");
    }

    if (!product.isDeleted) {
      throw new ValidationError("Product is not deleted");
    }

    if (!product.deletedAt) {
      throw new ValidationError("Product deleted date not found");
    }

    const deletedAtTime = product.deletedAt.getTime();
    const restoreLimitTime = 24 * 60 * 60 * 1000;
    const restoreDeadline = deletedAtTime + restoreLimitTime;

    if (Date.now() > restoreDeadline) {
      throw new ValidationError(
        "Restore time expired. Deleted products can only be restored within 24 hours.",
      );
    }

    const restoredProduct = await prisma.products.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product restored successfully",
      product: restoredProduct,
    });
  } catch (error) {
    return next(error);
  }
};

const assertSellerEventProduct = (
  product: Awaited<ReturnType<typeof getSellerOwnedProduct>>,
) => {
  if (!product.isEvent) {
    throw new NotFoundError("Event product not found for this shop");
  }
};

const getSellerEventStatusFilter = (status?: string): Prisma.productsWhereInput => {
  const now = new Date();

  switch ((status || "").trim().toLowerCase()) {
    case "upcoming":
      return {
        isDeleted: false,
        starting_date: { gt: now },
      };
    case "active":
      return {
        isDeleted: false,
        starting_date: { lte: now },
        ending_date: { gte: now },
      };
    case "ended":
    case "expired":
      return {
        isDeleted: false,
        ending_date: { lt: now },
      };
    case "deleted":
    case "archived":
      return { isDeleted: true };
    default:
      return { isDeleted: false };
  }
};

const getSellerEventOrderBy = (
  sort?: string,
): Prisma.productsOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "start-date":
    case "start_date":
      return { starting_date: "asc" };
    case "ending-soon":
    case "ending_soon":
      return { ending_date: "asc" };
    case "oldest":
      return { createdAt: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
};

// get seller-owned event products
export const getSellerEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const query = (getQueryString(req.query.q) || "").trim();
    const status = getQueryString(req.query.status);
    const sort = getQueryString(req.query.sort);
    const skip = (page - 1) * limit;
    const now = new Date();

    const whereClause: Prisma.productsWhereInput = {
      shopId: shop.id,
      isEvent: true,
      ...getSellerEventStatusFilter(status),
    };

    if (query) {
      whereClause.AND = [
        {
          OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { subCategory: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
          ],
        },
      ];
    }

    const baseWhere: Prisma.productsWhereInput = {
      shopId: shop.id,
      isEvent: true,
    };

    const [
      events,
      totalCount,
      totalEvents,
      activeEvents,
      upcomingEvents,
      endedEvents,
    ] = await Promise.all([
        prisma.products.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: getSellerEventOrderBy(sort),
        }),
        prisma.products.count({ where: whereClause }),
        prisma.products.count({
          where: { ...baseWhere, isDeleted: false },
        }),
        prisma.products.count({
          where: {
            ...baseWhere,
            isDeleted: false,
            starting_date: { lte: now },
            ending_date: { gte: now },
          },
        }),
        prisma.products.count({
          where: {
            ...baseWhere,
            isDeleted: false,
            starting_date: { gt: now },
          },
        }),
        prisma.products.count({
          where: {
            ...baseWhere,
            isDeleted: false,
            ending_date: { lt: now },
          },
        }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      success: true,
      events: withEffectivePricingMetadataList(events),
      products: withEffectivePricingMetadataList(events),
      pagination: {
        currentPage: page,
        page,
        totalPages,
        totalCount,
        totalItems: totalCount,
        total: totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats: {
        total: totalEvents,
        active: activeEvents,
        upcoming: upcomingEvents,
        ended: endedEvents,
        totalEvents,
        activeEvents,
        upcomingEvents,
        endedEvents,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// get one seller-owned event product
export const getSellerEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const event = await getSellerOwnedProduct(req.params.eventId, shop.id);
    assertSellerEventProduct(event);

    return res.status(200).json({
      success: true,
      event: withEffectivePricingMetadata(event),
      product: withEffectivePricingMetadata(event),
    });
  } catch (error) {
    return next(error);
  }
};

// create seller-owned event product
export const createSellerEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = isRecord(req.body) ? req.body : {};
    const productId = getTrimmedString(payload.productId);
    const startingDate = parseRequiredEventDate(
      payload.starting_date,
      "Event start date",
    );
    const endingDate = parseRequiredEventDate(
      payload.ending_date,
      "Event end date",
    );

    validateEventDateRange(startingDate, endingDate);

    if (!productId) {
      throw new ValidationError("Product ID is required");
    }

    const shop = await getSellerShop(req);
    const product = await getSellerOwnedProduct(productId, shop.id);
    const eventSalePrice = getValidatedEventSalePrice(
      payload.event_sale_price,
      product,
    );

    if (product.isDeleted) {
      throw new ValidationError("Deleted products cannot be used as events");
    }

    if (product.isEvent) {
      throw new ValidationError("Product is already an event");
    }

    if (product.status !== "Active") {
      throw new ValidationError("Only active products can be used as events");
    }

    const updated = await prisma.products.update({
      where: { id: product.id },
      data: {
        isEvent: true,
        starting_date: startingDate,
        ending_date: endingDate,
        event_sale_price: eventSalePrice,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Event created from product",
      event: withEffectivePricingMetadata(updated),
      product: withEffectivePricingMetadata(updated),
    });
  } catch (error) {
    return next(error);
  }
};

// update seller-owned event product
export const updateSellerEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const event = await getSellerOwnedProduct(req.params.eventId, shop.id);
    assertSellerEventProduct(event);

    const payload = isRecord(req.body) ? req.body : {};
    const startingDate = parseRequiredEventDate(
      payload.starting_date,
      "Event start date",
    );
    const endingDate = parseRequiredEventDate(
      payload.ending_date,
      "Event end date",
    );
    const eventSalePrice = getValidatedEventSalePrice(
      payload.event_sale_price,
      event,
    );

    validateEventDateRange(startingDate, endingDate);

    const updated = await prisma.products.update({
      where: { id: event.id },
      data: {
        isEvent: true,
        starting_date: startingDate,
        ending_date: endingDate,
        event_sale_price: eventSalePrice,
      },
    });

    return res.status(200).json({
      success: true,
      event: withEffectivePricingMetadata(updated),
      product: withEffectivePricingMetadata(updated),
    });
  } catch (error) {
    return next(error);
  }
};

// remove event status while keeping the product available as a normal product
export const deleteSellerEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const event = await getSellerOwnedProduct(req.params.eventId, shop.id);
    assertSellerEventProduct(event);

    const updated = await prisma.products.update({
      where: { id: event.id },
      data: {
        isEvent: false,
        starting_date: null,
        ending_date: null,
        event_sale_price: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Event removed. Product remains available as a normal product.",
      event: withEffectivePricingMetadata(updated),
      product: withEffectivePricingMetadata(updated),
    });
  } catch (error) {
    return next(error);
  }
};

// restore seller-owned deleted event product within 24 hours
export const restoreSellerEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const shop = await getSellerShop(req);
    const event = await getSellerOwnedProduct(req.params.eventId, shop.id);
    assertSellerEventProduct(event);

    if (!event.isDeleted) {
      throw new ValidationError("Event is not deleted");
    }

    if (!event.deletedAt) {
      throw new ValidationError("Event deleted date not found");
    }

    const restoreDeadline = event.deletedAt.getTime() + 24 * 60 * 60 * 1000;

    if (Date.now() > restoreDeadline) {
      throw new ValidationError(
        "Restore time expired. Deleted events can only be restored within 24 hours.",
      );
    }

    const restoredEvent = await prisma.products.update({
      where: { id: event.id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Event restored successfully",
      event: restoredEvent,
      product: restoredEvent,
    });
  } catch (error) {
    return next(error);
  }
};

// get shop products
export const getShopProducts = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = req.user.id;
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const query = (getQueryString(req.query.q) || "").trim();
    const category = getQueryString(req.query.category);
    const status = getQueryString(req.query.status);
    const stockState = getQueryString(req.query.stockState);
    const eventState = getQueryString(req.query.eventState);
    const sort = getQueryString(req.query.sort);

    const shop = await prisma.shop.findUnique({
      where: { sellerId },
    });

    if (!shop) {
      return res
        .status(404)
        .json({ message: "Shop not found for this seller" });
    }

    const skip = (page - 1) * limit;

    const whereClause: Prisma.productsWhereInput = {
      shopId: shop.id,
      ...getSellerProductStatusFilter(status),
    };

    if (query) {
      whereClause.AND = [
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { subCategory: { contains: query, mode: "insensitive" } },
            { tags: { has: query.toLowerCase() } },
          ],
        },
      ];
    }

    if (category && category !== "all") {
      whereClause.category = category;
    }

    if (eventState === "not-event") {
      whereClause.isEvent = false;
    } else if (eventState === "event") {
      whereClause.isEvent = true;
    }

    applySellerProductStockFilter(whereClause, stockState);

    const [products, totalCount, categoryRows] = await Promise.all([
      prisma.products.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: getSellerProductOrderBy(sort),
      }),
      prisma.products.count({
        where: whereClause,
      }),
      prisma.products.findMany({
        where: {
          shopId: shop.id,
          isDeleted: false,
        },
        select: {
          category: true,
        },
      }),
    ]);
    const totalPages = Math.ceil(totalCount / limit);
    const categories = Array.from(
      new Set(
        categoryRows
          .map((product) => product.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        page,
        totalPages,
        totalCount,
        totalItems: totalCount,
        total: totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        categories,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// upload product image
export const uploadProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const file = (req as any).file;

  try {
    if (!file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const imageStream = fs.createReadStream(file.path);

    const result = await imagekit.files.upload({
      file: imageStream,
      fileName: `${Date.now()}-${file.originalname}`,
      folder: "product-images",
    });

    return res.status(200).json({
      success: true,
      url: result.url,
      fileId: result.fileId,
    });
  } catch (error) {
    return next(error);
  } finally {
    if (file?.path && fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path);
    }
  }
};

// delete product image
export const deleteProductImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: "fileId is required" });
    }

    // Delete file from ImageKit
    const result = await imagekit.files.delete(fileId);

    return res.status(200).json({
      message: "Image deleted successfully",
      result,
    });
  } catch (error) {
    return next(error);
  }
};

// create product image
export const createProduct = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = req.user.id;

    const shop = await prisma.shop.findUnique({
      where: { sellerId },
    });

    if (!shop) {
      throw new ValidationError("Please create a shop first");
    }

    const {
      title,
      slug,
      category,
      subcategory,
      description,
      detailed_description,
      images,
      video_url,
      tags,
      brand,
      colors,
      sizes,
      isEvent,
      starting_date,
      ending_date,
      stock,
      sale_price,
      regular_price,
      warranty,
      custom_specifications,
      custom_properties,
      cash_on_delivery,
      discountCodes,
    } = req.body;

    // ✅ Basic validation
    if (!title || !slug || !category || !subcategory) {
      throw new ValidationError("Missing required fields");
    }

    if (!regular_price || !stock) {
      throw new ValidationError("Price and stock are required");
    }

    const isEventProduct = typeof isEvent === "boolean" ? isEvent : false;
    const startingDate = parseOptionalDate(starting_date, "Event start date");
    const endingDate = parseOptionalDate(ending_date, "Event end date");

    if (isEventProduct) {
      validateEventDateRange(startingDate, endingDate);
    }

    let formattedImages;

    try {
      formattedImages = normalizeImageAssetArray(images, {
        maxCount: 8,
        requireAtLeastOne: true,
      });
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : "Invalid product images",
      );
    }

    // ✅ Check slug uniqueness
    const existingProduct = await prisma.products.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      throw new ValidationError("Slug already exists");
    }

    const parsedTags: string[] =
      (tags as string)
        ?.split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.toLowerCase()) || [];

    const normalizedCustomProperties =
      normalizeCustomProperties(custom_properties);
    const normalizedOptionGroups = normalizeProductOptionGroups(
      normalizedCustomProperties.optionGroups,
    );
    const optionGroupColors = getOptionGroupValues(
      normalizedOptionGroups,
      "Color",
    );
    const optionGroupSizes = getOptionGroupValues(
      normalizedOptionGroups,
      "Size",
    );
    const normalizedColors =
      optionGroupColors.length > 0 ? optionGroupColors : normalizeStringList(colors);
    const normalizedSizes =
      optionGroupSizes.length > 0 ? optionGroupSizes : normalizeStringList(sizes);

    const product = await prisma.products.create({
      data: {
        title,
        slug,
        category,
        subCategory: subcategory,
        short_description: description,
        detailed_description,
        images: formattedImages,
        video_url,
        tags: parsedTags,
        brand,
        colors: normalizedColors,
        sizes: normalizedSizes,
        isEvent: isEventProduct,
        starting_date: startingDate,
        ending_date: endingDate,
        stock: Number(stock),
        sale_price: Number(sale_price) || 0,
        regular_price: Number(regular_price),
        warranty,
        custom_specifications: custom_specifications || {},
        custom_properties: {
          ...normalizedCustomProperties,
          optionGroups: normalizedOptionGroups,
        },
        cashOnDelivery: cash_on_delivery,
        discount_codes: discountCodes || [],
        shopId: shop.id,
      },
    });

    return res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    try {
      const images = req.body?.images || [];

      const validImages = normalizeImageAssetArray(images) || [];

      await Promise.all(
        validImages.map(async (img: any) => {
          try {
            await imagekit.files.delete(img.fileId);
          } catch (err) {
            console.error(`Failed to delete image ${img.fileId}`, err);
          }
        }),
      );
    } catch (cleanupError) {
      console.error("Rollback cleanup failed:", cleanupError);
    }

    return next(error);
  }
};
