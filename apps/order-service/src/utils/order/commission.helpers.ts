import prisma from "@libs/prisma";
import { toAmount } from "./order.helpers";

type CommissionClient = Pick<typeof prisma, "platformCommission">;

const roundMoney = (amount: number) =>
  Number((Number.isFinite(amount) ? amount : 0).toFixed(2));

const normalizeCommissionRate = (rawRate: string | undefined) => {
  if (!rawRate) return 0;

  const parsed = Number(rawRate);

  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  // Support either decimal rates like 0.1 or percentage rates like 10.
  const normalized = parsed > 1 ? parsed / 100 : parsed;

  return Math.min(normalized, 1);
};

export const getPlatformCommissionRate = () =>
  normalizeCommissionRate(process.env.PLATFORM_COMMISSION_RATE);

export const getPlatformCommissionData = ({
  orderId,
  orderPaymentId,
  sessionId,
  paymentIntentId,
  sellerId,
  shopId,
  totalCents,
  currency,
}: {
  orderId: string;
  orderPaymentId: string;
  sessionId: string;
  paymentIntentId: string;
  sellerId: string;
  shopId: string;
  totalCents: number;
  currency: string;
}) => {
  const commissionRate = getPlatformCommissionRate();
  const commissionBase = toAmount(totalCents);
  const commissionAmount = roundMoney(commissionBase * commissionRate);
  const sellerReceivableAmount = roundMoney(commissionBase - commissionAmount);

  return {
    orderId,
    orderPaymentId,
    sessionId,
    paymentIntentId,
    sellerId,
    shopId,
    commissionRate,
    commissionBase,
    commissionAmount,
    sellerReceivableAmount,
    currency,
    status: "Pending" as const,
  };
};

export const markCommissionEarnedForOrder = async (
  orderId: string,
  client: CommissionClient = prisma,
) => {
  await client.platformCommission.updateMany({
    where: {
      orderId,
      status: "Pending",
    },
    data: {
      status: "Earned",
      recognizedAt: new Date(),
    },
  });
};
