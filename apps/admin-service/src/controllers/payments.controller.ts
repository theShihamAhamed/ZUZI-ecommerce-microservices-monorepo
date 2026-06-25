import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import type { Prisma } from "@prisma/client";
import {
  getAllowedFilter,
  getListParams,
  getPagination,
  isObjectIdLike,
  roundMoney,
} from "../utils/admin-query";

const paymentStatuses = ["Pending", "Succeeded", "Failed", "Refunded"] as const;

const getPaymentSort = (
  sort?: string,
): Prisma.orderPaymentOrderByWithRelationInput => {
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

const getPaymentListPayload = async (payments: any[]) => {
  const userIds = [...new Set(payments.map((payment) => payment.userId))];
  const sessionIds = [...new Set(payments.map((payment) => payment.sessionId))];
  const [users, commissions] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [],
    sessionIds.length
      ? prisma.platformCommission.findMany({
          where: { sessionId: { in: sessionIds } },
        })
      : [],
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const commissionsBySessionId = new Map<string, typeof commissions>();

  commissions.forEach((commission) => {
    const current = commissionsBySessionId.get(commission.sessionId) || [];
    current.push(commission);
    commissionsBySessionId.set(commission.sessionId, current);
  });

  return payments.map((payment) => {
    const paymentCommissions =
      commissionsBySessionId.get(payment.sessionId) || [];

    return {
      id: payment.id,
      userId: payment.userId,
      sessionId: payment.sessionId,
      paymentIntentId: payment.paymentIntentId,
      subtotal: payment.subtotal,
      discountAmount: payment.discountAmount,
      total: payment.total,
      currency: payment.currency,
      paymentStatus: payment.paymentStatus,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      customer: usersById.get(payment.userId) || null,
      commissionAmount: roundMoney(
        paymentCommissions.reduce(
          (total, commission) => total + commission.commissionAmount,
          0,
        ),
      ),
      sellerReceivableAmount: roundMoney(
        paymentCommissions.reduce(
          (total, commission) => total + commission.sellerReceivableAmount,
          0,
        ),
      ),
      commissionRecords: paymentCommissions.length,
    };
  });
};

export const getAdminPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const params = getListParams(req.query);
    const paymentStatus = getAllowedFilter(params.status, paymentStatuses);
    const where: Prisma.orderPaymentWhereInput = {};

    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    if (params.q) {
      const searchFilters: Prisma.orderPaymentWhereInput[] = [
        { sessionId: { contains: params.q, mode: "insensitive" } },
        { paymentIntentId: { contains: params.q, mode: "insensitive" } },
        { stripeEventId: { contains: params.q, mode: "insensitive" } },
      ];

      if (isObjectIdLike(params.q)) {
        searchFilters.push({ id: params.q }, { userId: params.q });
      }

      where.OR = searchFilters;
    }

    const [payments, total] = await Promise.all([
      prisma.orderPayment.findMany({
        where,
        orderBy: getPaymentSort(params.sort),
        skip: params.skip,
        take: params.limit,
      }),
      prisma.orderPayment.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: await getPaymentListPayload(payments),
      pagination: getPagination(total, params.page, params.limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminPaymentsSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [payments, earnedCommission, pendingCommission] = await Promise.all([
      prisma.orderPayment.aggregate({
        where: { paymentStatus: "Succeeded" },
        _sum: { subtotal: true, discountAmount: true, total: true },
        _count: { id: true },
      }),
      prisma.platformCommission.aggregate({
        where: { status: "Earned" },
        _sum: { commissionAmount: true, sellerReceivableAmount: true },
      }),
      prisma.platformCommission.aggregate({
        where: { status: "Pending" },
        _sum: { commissionAmount: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        successfulPayments: payments._count.id,
        subtotal: roundMoney(payments._sum.subtotal || 0),
        discountAmount: roundMoney(payments._sum.discountAmount || 0),
        grossRevenue: roundMoney(payments._sum.total || 0),
        earnedCommission: roundMoney(
          earnedCommission._sum.commissionAmount || 0,
        ),
        pendingCommission: roundMoney(
          pendingCommission._sum.commissionAmount || 0,
        ),
        sellerReceivables: roundMoney(
          earnedCommission._sum.sellerReceivableAmount || 0,
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
};
