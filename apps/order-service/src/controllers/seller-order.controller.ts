import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import type { Prisma } from "@prisma/client";
import {
  createStatusHistoryEntry,
  getAllowedNextStatuses,
  getAllowedStatusFilter,
  getOrderDetailPayload,
  getOrdersPayload,
  getPagination,
  getPositiveNumber,
  getQueryString,
  getSellerId,
  isObjectIdLike,
  runOrderWrite,
} from "../utils/order/order.helpers";
import { markCommissionEarnedForOrder } from "../utils/order/commission.helpers";
import { OrderStatusValue } from "../utils/order/order.types";
import { publishOrderNotification } from "../utils/notification.publisher";
import { createReviewRequestsForDeliveredOrder } from "../utils/review-request.helpers";

const getAllowedPaymentStatusFilter = (status?: string) => {
  const allowedStatuses = new Set(["Pending", "Succeeded", "Failed", "Refunded"]);

  return status && allowedStatuses.has(status) ? status : undefined;
};

const getSellerOrderDate = (value: unknown, endOfDay = false) => {
  const rawValue = getQueryString(value);

  if (!rawValue) return undefined;

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) return undefined;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const getSellerOrderOrderBy = (
  sort?: string,
): Prisma.ordersOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "total-high":
    case "total_high":
      return { total: "desc" };
    case "total-low":
    case "total_low":
      return { total: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
};

export const getSellerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = getSellerId(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const status = getAllowedStatusFilter(getQueryString(req.query.status));
    const paymentStatus = getAllowedPaymentStatusFilter(
      getQueryString(req.query.paymentStatus),
    );
    const query = (getQueryString(req.query.q) || "").trim();
    const dateFrom = getSellerOrderDate(req.query.dateFrom);
    const dateTo = getSellerOrderDate(req.query.dateTo, true);
    const sort = getQueryString(req.query.sort);
    const skip = (page - 1) * limit;
    const where: Prisma.ordersWhereInput = { sellerId };

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as any;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    if (query) {
      const matchingOrderItems = await prisma.orderItems.findMany({
        where: {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          orderId: true,
        },
      });
      const matchingOrderIds = [
        ...new Set(matchingOrderItems.map((item) => item.orderId)),
      ];
      const searchFilters: Prisma.ordersWhereInput[] = [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { orderGroupId: { contains: query, mode: "insensitive" } },
      ];

      if (isObjectIdLike(query)) {
        searchFilters.push({ id: query });
      }

      if (matchingOrderIds.length > 0) {
        searchFilters.push({
          id: {
            in: matchingOrderIds,
          },
        });
      }

      where.OR = searchFilters;
    }

    const [orders, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: getSellerOrderOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.orders.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      orders: await getOrdersPayload(orders),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getSellerOrderDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = getSellerId(req);
    const { id } = req.params;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid order ID");
    }

    const order = await prisma.orders.findFirst({
      where: {
        id,
        sellerId,
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return res.status(200).json({
      success: true,
      order: await getOrderDetailPayload(order),
      allowedNextStatuses: getAllowedNextStatuses(order.status as OrderStatusValue),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateSellerOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = getSellerId(req);
    const { id } = req.params;
    const nextStatus = req.body?.status as OrderStatusValue | undefined;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid order ID");
    }

    if (
      !nextStatus ||
      !["Packed", "Shipped", "OutForDelivery", "Delivered"].includes(nextStatus)
    ) {
      throw new ValidationError("Invalid order status");
    }

    const order = await prisma.orders.findFirst({
      where: {
        id,
        sellerId,
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    // Sellers can only move orders forward through the fulfillment lifecycle.
    const allowedNextStatuses = getAllowedNextStatuses(
      order.status as OrderStatusValue,
    );

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new ValidationError("Unsupported order status transition");
    }

    const statusHistory = [
      ...((order.statusHistory || []) as unknown[]),
      createStatusHistoryEntry(
        nextStatus,
        `Order status updated to ${nextStatus}.`,
      ),
    ];
    const becameDelivered =
      order.status !== "Delivered" && nextStatus === "Delivered";
    const updatedOrder = await runOrderWrite(async (client) => {
      const updated = await client.orders.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          statusHistory: statusHistory as any,
        },
      });

      if (nextStatus === "Delivered") {
        await markCommissionEarnedForOrder(updated.id, client);
      }

      return updated;
    });

    await publishOrderNotification({
      recipientType: "user",
      recipientId: updatedOrder.userId,
      type: "ORDER_STATUS_UPDATED",
      title: "Order status updated",
      message: `Your order ${
        updatedOrder.orderNumber || updatedOrder.id
      } is now ${nextStatus}.`,
      redirectUrl: `/profile/orders/${updatedOrder.id}`,
      data: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: nextStatus,
      },
      dedupeKey: `user:order-status:${updatedOrder.userId}:${updatedOrder.id}:${nextStatus}`,
    });

    if (becameDelivered) {
      await createReviewRequestsForDeliveredOrder(updatedOrder);
    }

    return res.status(200).json({
      success: true,
      order: await getOrderDetailPayload(updatedOrder),
      allowedNextStatuses: getAllowedNextStatuses(nextStatus),
    });
  } catch (error) {
    return next(error);
  }
};
