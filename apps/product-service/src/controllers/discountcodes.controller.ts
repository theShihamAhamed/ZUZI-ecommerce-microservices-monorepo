import { NextFunction, Response } from "express";
import prisma from "@libs/prisma";
import {
  NotFoundError,
  ValidationError,
} from "@error-handler";

// create discount codes
export const createDiscountCode = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = (req as any).user.id;
    const { public_name, discountType, discountValue, discountCode } = req.body;

    const isDiscountCodeExist = await prisma.discount_codes.findUnique({
      where: { discountCode },
    });

    if (isDiscountCodeExist) {
      throw new ValidationError(
        "Discount code already available please use a different code!",
      );
    }

    const discount_code = await prisma.discount_codes.create({
      data: {
        public_name,
        discountType,
        discountValue: parseFloat(discountValue),
        discountCode,
        sellerId,
      },
    });

    res.status(201).json({
      success: true,
      discount_code,
    });
  } catch (error) {
    return next(error);
  }
};

// get discount codes
export const getDiscountCodes = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = (req as any).user.id;
    const discount_code = await prisma.discount_codes.findMany({
      where: { sellerId },
    });

    res.status(201).json({
      success: true,
      discount_code,
    });
  } catch (error) {
    return next(error);
  }
};

// get discount codes
export const deleteDiscountCode = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.query;
    const sellerId = (req as any).user.id;

    if (!id || typeof id !== "string") {
      throw new ValidationError("Discount code ID is required");
    }

    const discountCode = await prisma.discount_codes.findUnique({
      where: { id },
      select: { id: true, sellerId: true },
    });

    if (!discountCode) {
      throw new NotFoundError("Discount code not found!");
    }

    if (discountCode.sellerId !== sellerId) {
      throw new ValidationError("Unauthorized access!");
    }

    await prisma.discount_codes.delete({ where: { id } });
    res.status(200).json({ message: "Discount Code successfully deleted" });
  } catch (error) {
    return next(error);
  }
};
