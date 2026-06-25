import prisma from "@libs/prisma";
import {
  generateReviewRequestToken,
  getReviewRequestExpiryDate,
} from "@libs/review-token";
import { publishOrderNotification } from "./notification.publisher";

type DeliveredOrderForReviewRequest = {
  id: string;
  orderNumber?: string | null;
  userId: string;
  sellerId: string;
  shopId: string;
  paymentStatus: string;
  status: string;
};

type OrderItemForReviewRequest = {
  id: string;
  productId: string;
  title: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const isDeliveredPaidOrder = (order: DeliveredOrderForReviewRequest) =>
  order.status === "Delivered" && order.paymentStatus === "Succeeded";

const createReviewRequestForItem = async (
  order: DeliveredOrderForReviewRequest,
  item: OrderItemForReviewRequest,
) => {
  const [existingReview, existingRequest] = await Promise.all([
    prisma.productReview.findUnique({
      where: {
        orderItemId: item.id,
      },
      select: {
        id: true,
      },
    }),
    prisma.reviewRequest.findUnique({
      where: {
        orderItemId: item.id,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingReview || existingRequest) {
    return;
  }

  const reviewToken = generateReviewRequestToken();

  try {
    const request = await prisma.reviewRequest.create({
      data: {
        publicId: reviewToken.publicId,
        tokenHash: reviewToken.tokenHash,
        userId: order.userId,
        productId: item.productId,
        orderId: order.id,
        orderItemId: item.id,
        sellerId: order.sellerId,
        shopId: order.shopId,
        status: "Pending",
        expiresAt: getReviewRequestExpiryDate(),
      },
      select: {
        id: true,
        publicId: true,
      },
    });
    const notificationSent = await publishOrderNotification({
      recipientType: "user",
      recipientId: order.userId,
      type: "REVIEW_REQUESTED",
      title: "Review your purchase",
      message: `How was ${item.title}? Share your feedback.`,
      redirectUrl: `/reviews/submit/${reviewToken.token}`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderItemId: item.id,
        productId: item.productId,
        reviewRequestPublicId: request.publicId,
      },
      dedupeKey: `user:review-request:${order.userId}:${item.id}`,
    });

    if (notificationSent) {
      await prisma.reviewRequest.update({
        where: {
          id: request.id,
        },
        data: {
          notificationSentAt: new Date(),
        },
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return;
    }

    console.warn("Review request generation failed", {
      orderId: order.id,
      orderItemId: item.id,
      productId: item.productId,
      error: getErrorMessage(error),
    });
  }
};

export const createReviewRequestsForDeliveredOrder = async (
  order: DeliveredOrderForReviewRequest,
) => {
  if (!isDeliveredPaidOrder(order)) return;

  try {
    const items = await prisma.orderItems.findMany({
      where: {
        orderId: order.id,
      },
      select: {
        id: true,
        productId: true,
        title: true,
      },
    });

    for (const item of items) {
      await createReviewRequestForItem(order, item);
    }
  } catch (error) {
    console.warn("Review request generation skipped for delivered order", {
      orderId: order.id,
      error: getErrorMessage(error),
    });
  }
};
