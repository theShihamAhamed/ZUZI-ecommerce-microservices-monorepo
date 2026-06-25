import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import {
  getAllowedStatusFilter,
  getCustomerId,
  getOrderDetailPayload,
  getOrdersPayload,
  getPagination,
  getPositiveNumber,
  getQueryString,
  isObjectIdLike,
} from "../utils/order/order.helpers";

export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const status = getAllowedStatusFilter(getQueryString(req.query.status));
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.orders.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      orders: await getOrdersPayload(orders, {
        includeCustomerReviewRequestsForUserId: userId,
      }),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyOrderDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const { id } = req.params;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid order ID");
    }

    const order = await prisma.orders.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return res.status(200).json({
      success: true,
      order: await getOrderDetailPayload(order, {
        includeCustomerReviewRequestsForUserId: userId,
      }),
    });
  } catch (error) {
    return next(error);
  }
};
