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

const sellerStatuses = [
  "PENDING",
  "EMAIL_VERIFIED",
  "SHOP_CREATED",
  "ACTIVE",
] as const;

const getSellerSort = (sort?: string): Prisma.sellerOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { name: "asc" };
    default:
      return { createdAt: "desc" };
  }
};

const getSellerStats = async (sellerIds: string[]) => {
  const [orders, products] = await Promise.all([
    sellerIds.length
      ? prisma.orders.findMany({
          where: { sellerId: { in: sellerIds } },
          select: { sellerId: true, total: true },
        })
      : [],
    sellerIds.length
      ? prisma.shop.findMany({
          where: { sellerId: { in: sellerIds } },
          select: {
            sellerId: true,
            _count: {
              select: { products: true },
            },
          },
        })
      : [],
  ]);
  const stats = new Map<
    string,
    { orderCount: number; orderTotal: number; productCount: number }
  >();

  sellerIds.forEach((id) => {
    stats.set(id, { orderCount: 0, orderTotal: 0, productCount: 0 });
  });

  orders.forEach((order) => {
    const current = stats.get(order.sellerId);

    if (current) {
      current.orderCount += 1;
      current.orderTotal += order.total;
    }
  });

  products.forEach((shop) => {
    const current = stats.get(shop.sellerId);

    if (current) {
      current.productCount = shop._count.products;
    }
  });

  return stats;
};

export const getAdminSellers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const params = getListParams(req.query);
    const status = getAllowedFilter(params.status, sellerStatuses);
    const where: Prisma.sellerWhereInput = {};

    if (status) where.status = status;
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
        { country: { contains: params.q, mode: "insensitive" } },
      ];

      if (isObjectIdLike(params.q)) {
        where.OR.push({ id: params.q });
      }
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        orderBy: getSellerSort(params.sort),
        skip: params.skip,
        take: params.limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          country: true,
          stripeId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              category: true,
              ratings: true,
              address: true,
            },
          },
        },
      }),
      prisma.seller.count({ where }),
    ]);
    const stats = await getSellerStats(sellers.map((seller) => seller.id));

    return res.status(200).json({
      success: true,
      data: sellers.map((seller) => ({
        id: seller.id,
        name: seller.name,
        email: seller.email,
        phone_number: seller.phone_number,
        country: seller.country,
        hasStripeAccount: Boolean(seller.stripeId),
        status: seller.status,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt,
        shop: seller.shop,
        stats: stats.get(seller.id),
      })),
      pagination: getPagination(total, params.page, params.limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminSellerDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid seller ID");
    }

    const seller = await prisma.seller.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        country: true,
        stripeId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        shop: true,
      },
    });

    if (!seller) {
      throw new NotFoundError("Seller not found");
    }

    const stats = await getSellerStats([seller.id]);

    const { stripeId: _stripeId, ...safeSeller } = seller;

    return res.status(200).json({
      success: true,
      data: {
        ...safeSeller,
        hasStripeAccount: Boolean(_stripeId),
        stats: stats.get(seller.id),
      },
    });
  } catch (error) {
    return next(error);
  }
};
