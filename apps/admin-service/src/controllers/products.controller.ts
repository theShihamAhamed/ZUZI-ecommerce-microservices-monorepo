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

const productStatuses = ["Active", "Pending", "Draft"] as const;

const getProductSort = (
  sort?: string,
): Prisma.productsOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "price-high":
      return { sale_price: "desc" };
    case "price-low":
      return { sale_price: "asc" };
    case "sales":
      return { totalSales: "desc" };
    default:
      return { createdAt: "desc" };
  }
};

const productSelect = {
  id: true,
  title: true,
  slug: true,
  category: true,
  subCategory: true,
  short_description: true,
  images: true,
  stock: true,
  sale_price: true,
  regular_price: true,
  totalSales: true,
  ratings: true,
  status: true,
  isDeleted: true,
  isEvent: true,
  starting_date: true,
  ending_date: true,
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
} satisfies Prisma.productsSelect;

export const getAdminProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const params = getListParams(req.query);
    const status = getAllowedFilter(params.status, productStatuses);
    const where: Prisma.productsWhereInput = {};

    if (status) where.status = status;
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: "insensitive" } },
        { slug: { contains: params.q, mode: "insensitive" } },
        { category: { contains: params.q, mode: "insensitive" } },
        { subCategory: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        select: productSelect,
        orderBy: getProductSort(params.sort),
        skip: params.skip,
        take: params.limit,
      }),
      prisma.products.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: getPagination(total, params.page, params.limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminProductDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid product ID");
    }

    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        shop: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};
