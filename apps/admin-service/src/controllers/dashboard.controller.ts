import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { roundMoney } from "../utils/admin-query";

const getMoneySum = (value: number | null | undefined) => roundMoney(value || 0);

export const getDashboardSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [
      users,
      sellers,
      activeSellers,
      shops,
      products,
      activeProducts,
      pendingProducts,
      orders,
      successfulPayments,
      grossRevenue,
      earnedCommission,
      pendingCommission,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.seller.count(),
      prisma.seller.count({ where: { status: "ACTIVE" } }),
      prisma.shop.count(),
      prisma.products.count(),
      prisma.products.count({ where: { status: "Active", isDeleted: false } }),
      prisma.products.count({ where: { status: "Pending", isDeleted: false } }),
      prisma.orders.count(),
      prisma.orderPayment.count({ where: { paymentStatus: "Succeeded" } }),
      prisma.orderPayment.aggregate({
        where: { paymentStatus: "Succeeded" },
        _sum: { total: true },
      }),
      prisma.platformCommission.aggregate({
        where: { status: "Earned" },
        _sum: { commissionAmount: true, sellerReceivableAmount: true },
      }),
      prisma.platformCommission.aggregate({
        where: { status: "Pending" },
        _sum: { commissionAmount: true },
      }),
      prisma.orders.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          orderGroupId: true,
          total: true,
          currency: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          users,
          sellers,
          activeSellers,
          shops,
          products,
          activeProducts,
          pendingProducts,
          orders,
          successfulPayments,
          grossRevenue: getMoneySum(grossRevenue._sum.total),
          earnedCommission: getMoneySum(earnedCommission._sum.commissionAmount),
          pendingCommission: getMoneySum(pendingCommission._sum.commissionAmount),
          sellerReceivables: getMoneySum(
            earnedCommission._sum.sellerReceivableAmount,
          ),
        },
        recentOrders,
      },
    });
  } catch (error) {
    return next(error);
  }
};
