import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import type { Prisma } from "@prisma/client";
import { getListParams, getPagination, isObjectIdLike } from "../utils/admin-query";

const getUserSort = (sort?: string): Prisma.userOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { name: "asc" };
    default:
      return { createdAt: "desc" };
  }
};

export const getAdminUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const params = getListParams(req.query);
    const where: Prisma.userWhereInput = {};

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
      ];

      if (isObjectIdLike(params.q)) {
        where.OR.push({ id: params.q });
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: getUserSort(params.sort),
        skip: params.skip,
        take: params.limit,
        select: {
          id: true,
          name: true,
          email: true,
          following: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: users.map((user) => ({
        ...user,
        followingCount: user.following.length,
      })),
      pagination: getPagination(total, params.page, params.limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminUserDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid user ID");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        following: true,
        createdAt: true,
        updatedAt: true,
        shippingAddresses: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const [ordersCount, ordersTotal] = await Promise.all([
      prisma.orders.count({ where: { userId: id } }),
      prisma.orders.aggregate({
        where: { userId: id },
        _sum: { total: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        ordersCount,
        ordersTotal: ordersTotal._sum.total || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};
