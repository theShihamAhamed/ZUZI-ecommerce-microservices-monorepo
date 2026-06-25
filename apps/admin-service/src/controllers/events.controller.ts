import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import type { Prisma } from "@prisma/client";
import { getListParams, getPagination } from "../utils/admin-query";

const getEventSort = (sort?: string): Prisma.productsOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "ending-soon":
      return { ending_date: "asc" };
    case "sales":
      return { totalSales: "desc" };
    default:
      return { createdAt: "desc" };
  }
};

export const getAdminEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const params = getListParams(req.query);
    const where: Prisma.productsWhereInput = { isEvent: true };

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: "insensitive" } },
        { category: { contains: params.q, mode: "insensitive" } },
        { subCategory: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.products.findMany({
        where,
        orderBy: getEventSort(params.sort),
        skip: params.skip,
        take: params.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          sale_price: true,
          totalSales: true,
          ratings: true,
          status: true,
          isDeleted: true,
          starting_date: true,
          ending_date: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.products.count({ where }),
    ]);
    const analytics = events.length
      ? await prisma.productAnalytics.findMany({
          where: { productId: { in: events.map((event) => event.id) } },
        })
      : [];
    const analyticsByProductId = new Map(
      analytics.map((item) => [item.productId, item]),
    );

    return res.status(200).json({
      success: true,
      data: events.map((event) => ({
        ...event,
        analytics: analyticsByProductId.get(event.id) || null,
      })),
      pagination: getPagination(total, params.page, params.limit),
    });
  } catch (error) {
    return next(error);
  }
};
