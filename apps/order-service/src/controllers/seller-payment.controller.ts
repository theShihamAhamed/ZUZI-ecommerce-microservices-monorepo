import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import type { Prisma } from "@prisma/client";
import {
  getPagination,
  getPositiveNumber,
  getQueryString,
  getSellerId,
} from "../utils/order/order.helpers";

const commissionStatuses = ["Pending", "Earned", "Reversed", "Refunded"] as const;

const roundMoney = (amount: number | null | undefined) =>
  Number((Number.isFinite(amount || 0) ? amount || 0 : 0).toFixed(2));

const getAllowedCommissionStatus = (status?: string) => {
  return status && commissionStatuses.includes(status as any)
    ? (status as (typeof commissionStatuses)[number])
    : undefined;
};

const getSellerPaymentDate = (value: unknown, endOfDay = false) => {
  const rawValue = getQueryString(value);

  if (!rawValue) return undefined;

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) return undefined;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const getSellerPaymentOrderBy = (
  sort?: string,
): Prisma.platformCommissionOrderByWithRelationInput => {
  switch ((sort || "").trim().toLowerCase()) {
    case "oldest":
      return { createdAt: "asc" };
    case "gross-high":
    case "gross_high":
      return { commissionBase: "desc" };
    case "gross-low":
    case "gross_low":
      return { commissionBase: "asc" };
    case "commission-high":
    case "commission_high":
      return { commissionAmount: "desc" };
    case "receivable-high":
    case "receivable_high":
      return { sellerReceivableAmount: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
};

const buildSellerPaymentsWhere = ({
  sellerId,
  status,
  dateFrom,
  dateTo,
}: {
  sellerId: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Prisma.platformCommissionWhereInput => ({
  sellerId,
  ...(status ? { status: status as any } : {}),
  ...(dateFrom || dateTo
    ? {
        createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      }
    : {}),
});

const getSellerPaymentRows = async (commissions: any[], sellerId: string) => {
  const orderIds = [...new Set(commissions.map((item) => item.orderId))];
  const orderPaymentIds = [
    ...new Set(
      commissions.map((item) => item.orderPaymentId).filter(Boolean),
    ),
  ];

  const [orders, orderPayments] = await Promise.all([
    orderIds.length
      ? prisma.orders.findMany({
          where: {
            id: { in: orderIds },
            sellerId,
          },
          select: {
            id: true,
            orderNumber: true,
            orderGroupId: true,
            status: true,
            paymentStatus: true,
          },
        })
      : [],
    orderPaymentIds.length
      ? prisma.orderPayment.findMany({
          where: {
            id: { in: orderPaymentIds },
          },
          select: {
            id: true,
            paymentStatus: true,
          },
        })
      : [],
  ]);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const paymentsById = new Map(
    orderPayments.map((payment) => [payment.id, payment]),
  );

  return commissions.map((commission) => {
    const order = ordersById.get(commission.orderId);
    const payment = commission.orderPaymentId
      ? paymentsById.get(commission.orderPaymentId)
      : null;

    return {
      id: commission.id,
      orderId: commission.orderId,
      orderNumber: order?.orderNumber || null,
      orderGroupId: order?.orderGroupId || null,
      paymentReference: payment?.id || commission.orderPaymentId || null,
      commissionBase: roundMoney(commission.commissionBase),
      commissionAmount: roundMoney(commission.commissionAmount),
      sellerReceivableAmount: roundMoney(commission.sellerReceivableAmount),
      currency: commission.currency,
      status: commission.status,
      createdAt: commission.createdAt,
      recognizedAt: commission.recognizedAt,
      orderStatus: order?.status || null,
      paymentStatus: order?.paymentStatus || payment?.paymentStatus || null,
    };
  });
};

export const getSellerPaymentsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = getSellerId(req);
    const [all, pending, earned, totalRecords] = await Promise.all([
      prisma.platformCommission.aggregate({
        where: { sellerId },
        _sum: {
          commissionBase: true,
          commissionAmount: true,
          sellerReceivableAmount: true,
        },
      }),
      prisma.platformCommission.aggregate({
        where: { sellerId, status: "Pending" },
        _sum: {
          commissionAmount: true,
          sellerReceivableAmount: true,
        },
      }),
      prisma.platformCommission.aggregate({
        where: { sellerId, status: "Earned" },
        _sum: {
          commissionAmount: true,
          sellerReceivableAmount: true,
        },
      }),
      prisma.platformCommission.count({ where: { sellerId } }),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        grossSales: roundMoney(all._sum.commissionBase),
        totalCommission: roundMoney(all._sum.commissionAmount),
        sellerReceivable: roundMoney(all._sum.sellerReceivableAmount),
        pendingCommission: roundMoney(pending._sum.commissionAmount),
        earnedCommission: roundMoney(earned._sum.commissionAmount),
        pendingReceivable: roundMoney(pending._sum.sellerReceivableAmount),
        earnedReceivable: roundMoney(earned._sum.sellerReceivableAmount),
        totalRecords,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getSellerPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = getSellerId(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 10), 50);
    const status = getAllowedCommissionStatus(getQueryString(req.query.status));
    const dateFrom = getSellerPaymentDate(req.query.dateFrom);
    const dateTo = getSellerPaymentDate(req.query.dateTo, true);
    const sort = getQueryString(req.query.sort);
    const skip = (page - 1) * limit;
    const where = buildSellerPaymentsWhere({
      sellerId,
      status,
      dateFrom,
      dateTo,
    });

    const [commissions, total] = await Promise.all([
      prisma.platformCommission.findMany({
        where,
        orderBy: getSellerPaymentOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.platformCommission.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      payments: await getSellerPaymentRows(commissions, sellerId),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};
