import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import redis from "@libs/redis";
import { ValidationError, ForbiddenError } from "@error-handler";
import {
  PAYMENT_SESSION_TTL_SECONDS,
  REUSABLE_PAYMENT_STATUSES,
} from "../utils/order/order.constants";
import {
  buildSummary,
  buildTrustedCheckout,
  getCartHash,
  getCustomerId,
  getLookupKey,
  getSessionData,
  getSessionKey,
  getStripeClient,
  mapStripePaymentStatus,
  toCents,
} from "../utils/order/order.helpers";
import { PaymentSessionData } from "../utils/order/order.types";
import prisma from "@libs/prisma";

const getPaymentVerificationMessage = (
  paymentStatus: string,
  orderCreated: boolean,
) => {
  if (paymentStatus === "Succeeded" && orderCreated) {
    return "Order created successfully.";
  }

  if (paymentStatus === "Succeeded") {
    return "Payment received. We are finalizing your order.";
  }

  if (paymentStatus === "Pending") {
    return "Payment is still pending.";
  }

  return "Payment was not completed.";
};

const getSessionOrderStatus = async (
  sessionId: string,
  paymentStatus: string,
) => {
  const orders = await prisma.orders.findMany({
    where: { sessionId },
    select: {
      id: true,
      status: true,
      orderGroupId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const primaryOrder = orders[0];
  const orderCreated = orders.length > 0;

  return {
    orderStatus: primaryOrder?.status || null,
    orderCreated,
    orderGroupId: primaryOrder?.orderGroupId || null,
    orderIds: orders.map((order) => order.id),
    message: getPaymentVerificationMessage(paymentStatus, orderCreated),
  };
};

export const createPaymentSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const trustedCheckout = await buildTrustedCheckout({
      userId,
      items: req.body?.items,
      shippingAddressId: req.body?.shippingAddressId,
      couponCode: req.body?.couponCode,
    });
    const couponCode = trustedCheckout.coupon?.code || null;
    const cartHash = getCartHash({
      normalizedCart: trustedCheckout.normalizedCart,
      shippingAddressId: trustedCheckout.shippingAddressId,
      couponCode,
    });
    const lookupKey = getLookupKey(userId, cartHash);
    const existingSessionId = await redis.get(lookupKey);
    const stripe = getStripeClient();

    // Reuse an active PaymentIntent when the cart, address, and coupon are unchanged.
    if (existingSessionId) {
      const existingSession = await getSessionData(existingSessionId);

      if (
        existingSession &&
        existingSession.userId === userId &&
        existingSession.cartHash === cartHash &&
        existingSession.totalCents === trustedCheckout.totalCents
      ) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          existingSession.paymentIntentId,
        );

        if (
          paymentIntent.client_secret &&
          REUSABLE_PAYMENT_STATUSES.has(paymentIntent.status)
        ) {
          const refreshedSession: PaymentSessionData = {
            ...trustedCheckout,
            sessionId: existingSession.sessionId,
            userId,
            cartHash,
            paymentIntentId: existingSession.paymentIntentId,
            lookupKey,
            createdAt: existingSession.createdAt,
          };

          await redis.set(
            getSessionKey(existingSession.sessionId),
            JSON.stringify(refreshedSession),
            "EX",
            PAYMENT_SESSION_TTL_SECONDS,
          );
          await redis.set(
            lookupKey,
            existingSession.sessionId,
            "EX",
            PAYMENT_SESSION_TTL_SECONDS,
          );

          return res.status(200).json({
            success: true,
            sessionId: existingSession.sessionId,
            clientSecret: paymentIntent.client_secret,
            summary: buildSummary(refreshedSession),
          });
        }
      }

      await redis.del(lookupKey);
    }

    const sessionId = crypto.randomUUID();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: trustedCheckout.totalCents,
      currency: trustedCheckout.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sessionId,
        userId,
        shippingAddressId: trustedCheckout.shippingAddressId,
        couponCode: couponCode || "",
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret");
    }

    const sessionData: PaymentSessionData = {
      ...trustedCheckout,
      sessionId,
      userId,
      cartHash,
      paymentIntentId: paymentIntent.id,
      lookupKey,
      createdAt: new Date().toISOString(),
    };

    await redis.set(
      getSessionKey(sessionId),
      JSON.stringify(sessionData),
      "EX",
      PAYMENT_SESSION_TTL_SECONDS,
    );
    await redis.set(lookupKey, sessionId, "EX", PAYMENT_SESSION_TTL_SECONDS);

    return res.status(201).json({
      success: true,
      sessionId,
      clientSecret: paymentIntent.client_secret,
      summary: buildSummary(sessionData),
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyingPaymentSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const sessionId = req.query.sessionId;

    if (typeof sessionId !== "string" || !sessionId.trim()) {
      throw new ValidationError("Payment session ID is required");
    }

    const session = await getSessionData(sessionId);

    if (session) {
      if (session.userId !== userId) {
        throw new ForbiddenError("Payment session does not belong to this user");
      }

      const paymentRecord = await prisma.orderPayment.findUnique({
        where: { sessionId },
      });
      let paymentStatus = paymentRecord?.paymentStatus || "Pending";

      if (!paymentRecord) {
        try {
          const stripe = getStripeClient();
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.paymentIntentId,
          );
          paymentStatus = mapStripePaymentStatus(paymentIntent.status);
        } catch {
          paymentStatus = "Pending";
        }
      }

      const orderStatus = await getSessionOrderStatus(
        sessionId,
        paymentStatus,
      );

      return res.status(200).json({
        success: true,
        valid: true,
        expired: false,
        paymentStatus,
        ...orderStatus,
        summary: buildSummary(session),
      });
    }

    const paymentRecord = await prisma.orderPayment.findUnique({
      where: { sessionId },
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        valid: false,
        expired: true,
        message: "Payment session expired",
      });
    }

    if (paymentRecord.userId !== userId) {
      throw new ForbiddenError("Payment session does not belong to this user");
    }

    const orderStatus = await getSessionOrderStatus(
      sessionId,
      paymentRecord.paymentStatus,
    );

    return res.status(200).json({
      success: true,
      valid: true,
      expired: true,
      paymentStatus: paymentRecord.paymentStatus,
      ...orderStatus,
      summary: buildSummary({
        subtotalCents: toCents(paymentRecord.subtotal),
        discountAmountCents: toCents(paymentRecord.discountAmount),
        totalCents: toCents(paymentRecord.total),
        currency: paymentRecord.currency,
      }),
    });
  } catch (error) {
    return next(error);
  }
};
