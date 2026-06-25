import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import type { Prisma } from "@prisma/client";
import {
  getAllowedFilter,
  getListParams,
  getPagination,
  isObjectIdLike,
} from "../utils/admin-query";

const orderStatuses = [
  "Ordered",
  "Packed",
  "Paid",
  "Processing",
  "Shipped",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
  "Refunded",
] as const;
const paymentStatuses = ["Pending", "Succeeded", "Failed", "Refunded"] as const;

const getOrderSort = (sort?: string): Prisma.ordersOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "total-high":
      return { total: "desc" };
    case "total-low":
      return { total: "asc" };
    default:
      return { createdAt: "desc" };
  }
};

const getOrderListPayload = async (orders: any[]) => {
  const orderIds = orders.map((order) => order.id);
  const userIds = [...new Set(orders.map((order) => order.userId))];
  const sellerIds = [...new Set(orders.map((order) => order.sellerId))];
  const shopIds = [...new Set(orders.map((order) => order.shopId))];
  const [items, users, sellers, shops, commissions] = await Promise.all([
    orderIds.length
      ? prisma.orderItems.findMany({ where: { orderId: { in: orderIds } } })
      : [],
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [],
    sellerIds.length
      ? prisma.seller.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, name: true, email: true, status: true },
        })
      : [],
    shopIds.length
      ? prisma.shop.findMany({
          where: { id: { in: shopIds } },
          select: { id: true, name: true, category: true, ratings: true },
        })
      : [],
    orderIds.length
      ? prisma.platformCommission.findMany({
          where: { orderId: { in: orderIds } },
        })
      : [],
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));
  const shopsById = new Map(shops.map((shop) => [shop.id, shop]));
  const commissionsByOrderId = new Map(
    commissions.map((commission) => [commission.orderId, commission]),
  );
  const itemCountsByOrderId = new Map<string, number>();

  items.forEach((item) => {
    itemCountsByOrderId.set(
      item.orderId,
      (itemCountsByOrderId.get(item.orderId) || 0) + item.quantity,
    );
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderGroupId: order.orderGroupId,
    sessionId: order.sessionId,
    total: order.total,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    itemCount: itemCountsByOrderId.get(order.id) || 0,
    customer: usersById.get(order.userId) || null,
    seller: sellersById.get(order.sellerId) || null,
    shop: shopsById.get(order.shopId) || null,
    commission: commissionsByOrderId.get(order.id) || null,
  }));
};

export const getAdminOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const params = getListParams(req.query);
    const status = getAllowedFilter(params.status, orderStatuses);
    const paymentStatus = getAllowedFilter(
      req.query.paymentStatus as string | undefined,
      paymentStatuses,
    );
    const where: Prisma.ordersWhereInput = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    if (params.q) {
      const matchingItems = await prisma.orderItems.findMany({
        where: { title: { contains: params.q, mode: "insensitive" } },
        select: { orderId: true },
      });
      const matchingOrderIds = [
        ...new Set(matchingItems.map((item) => item.orderId)),
      ];
      const searchFilters: Prisma.ordersWhereInput[] = [
        { orderNumber: { contains: params.q, mode: "insensitive" } },
        { orderGroupId: { contains: params.q, mode: "insensitive" } },
        { sessionId: { contains: params.q, mode: "insensitive" } },
        { paymentIntentId: { contains: params.q, mode: "insensitive" } },
      ];

      if (isObjectIdLike(params.q)) {
        searchFilters.push({ id: params.q });
      }

      if (matchingOrderIds.length) {
        searchFilters.push({ id: { in: matchingOrderIds } });
      }

      where.OR = searchFilters;
    }

    const [orders, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: getOrderSort(params.sort),
        skip: params.skip,
        take: params.limit,
      }),
      prisma.orders.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: await getOrderListPayload(orders),
      pagination: getPagination(total, params.page, params.limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOrderDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid order ID");
    }

    const order = await prisma.orders.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const [items, customer, seller, shop, commission] = await Promise.all([
      prisma.orderItems.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: order.userId },
        select: { id: true, name: true, email: true },
      }),
      prisma.seller.findUnique({
        where: { id: order.sellerId },
        select: { id: true, name: true, email: true, status: true },
      }),
      prisma.shop.findUnique({
        where: { id: order.shopId },
        select: { id: true, name: true, category: true, ratings: true },
      }),
      prisma.platformCommission.findUnique({
        where: { orderId: order.id },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        items,
        customer,
        seller,
        shop,
        commission,
      },
    });
  } catch (error) {
    return next(error);
  }
};
