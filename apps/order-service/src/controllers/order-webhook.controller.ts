import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import redis from "@libs/redis";
import prisma from "@libs/prisma";
import { ValidationError } from "@error-handler";
import {
  buildTrustedCheckout,
  createOrderGroupId,
  createOrderNotifications,
  createOrderNumber,
  createStatusHistoryEntry,
  getSessionData,
  getSessionKey,
  getStripeClient,
  runOrderWrite,
  sendBuyerOrderConfirmation,
  toAmount,
  updateAnalyticsAfterOrder,
} from "../utils/order/order.helpers";
import { getPlatformCommissionData } from "../utils/order/commission.helpers";
import { CreatedOrderSummary } from "../utils/order/order.types";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    if (typeof signature !== "string") {
      throw new ValidationError("Missing Stripe signature");
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret,
    );

    if (event.type !== "payment_intent.succeeded") {
      return res.status(200).json({ received: true });
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const sessionId = paymentIntent.metadata?.sessionId;
    const userId = paymentIntent.metadata?.userId;

    if (!sessionId || !userId) {
      console.warn("Stripe payment intent missing order metadata");
      return res.status(200).json({ received: true });
    }

    const existingPayment = await prisma.orderPayment.findFirst({
      where: {
        OR: [{ sessionId }, { paymentIntentId: paymentIntent.id }],
      },
    });

    if (existingPayment) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const session = await getSessionData(sessionId);

    if (!session) {
      console.warn(`Payment session ${sessionId} not found for webhook`);
      return res.status(200).json({ received: true, missingSession: true });
    }

    if (session.userId !== userId) {
      console.warn(`Payment session ${sessionId} user mismatch`);
      return res.status(200).json({ received: true, userMismatch: true });
    }

    const trustedCheckout = await buildTrustedCheckout({
      userId,
      items: session.normalizedCart,
      shippingAddressId: session.shippingAddressId,
      couponCode: session.coupon?.code || undefined,
    });
    const amountReceived = paymentIntent.amount_received || paymentIntent.amount;

    if (amountReceived < trustedCheckout.totalCents) {
      throw new ValidationError("Paid amount is less than order total");
    }

    const orderGroupId = createOrderGroupId();
    const initialStatusHistory = [
      createStatusHistoryEntry(
        "Ordered",
        "Payment succeeded and the order was placed.",
      ),
    ];

    // Keep payment record, shop orders, line items, and stock decrement together.
    const createdOrders = await runOrderWrite(async (client) => {
      const createdOrderSummaries: CreatedOrderSummary[] = [];

      const orderPayment = await client.orderPayment.create({
        data: {
          userId,
          sessionId,
          paymentIntentId: paymentIntent.id,
          stripeEventId: event.id,
          subtotal: toAmount(trustedCheckout.subtotalCents),
          discountAmount: toAmount(trustedCheckout.discountAmountCents),
          total: toAmount(trustedCheckout.totalCents),
          currency: trustedCheckout.currency,
          paymentStatus: "Succeeded",
        },
      });

      for (const [groupIndex, group] of trustedCheckout.shopGroups.entries()) {
        const orderNumber = createOrderNumber(groupIndex);
        const order = await client.orders.create({
          data: {
            orderNumber,
            orderGroupId,
            userId,
            shopId: group.shopId,
            sellerId: group.sellerId,
            shippingAddressId: trustedCheckout.shippingAddressId,
            shippingAddressSnapshot: trustedCheckout.shippingAddressSnapshot,
            sessionId,
            paymentIntentId: paymentIntent.id,
            couponCode: trustedCheckout.coupon?.code || null,
            subtotal: toAmount(group.subtotalCents),
            discountAmount: toAmount(group.discountAmountCents),
            total: toAmount(group.totalCents),
            currency: trustedCheckout.currency,
            status: "Ordered",
            paymentStatus: "Succeeded",
            statusHistory: initialStatusHistory,
          },
        });

        await client.platformCommission.create({
          data: getPlatformCommissionData({
            orderId: order.id,
            orderPaymentId: orderPayment.id,
            sessionId,
            paymentIntentId: paymentIntent.id,
            sellerId: group.sellerId,
            shopId: group.shopId,
            totalCents: group.totalCents,
            currency: trustedCheckout.currency,
          }),
        });

        for (const item of group.items) {
          await client.orderItems.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              title: item.title,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitPrice: toAmount(item.unitAmountCents),
              total: toAmount(item.totalAmountCents),
              selectedOptions: item.selectedOptions || undefined,
            },
          });
        }

        createdOrderSummaries.push({
          id: order.id,
          orderNumber,
          orderGroupId,
          shopId: group.shopId,
          sellerId: group.sellerId,
          total: toAmount(group.totalCents),
          items: group.items,
        });
      }

      for (const item of trustedCheckout.trustedItems) {
        const stockUpdate = await client.products.updateMany({
          where: {
            id: item.productId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
            totalSales: {
              increment: item.quantity,
            },
          },
        });

        if (stockUpdate.count === 0) {
          throw new ValidationError(`Insufficient stock for ${item.title}`);
        }
      }

      return createdOrderSummaries;
    });

    await updateAnalyticsAfterOrder(trustedCheckout.trustedItems);
    await Promise.all([
      sendBuyerOrderConfirmation({ userId, sessionId, orders: createdOrders }),
      createOrderNotifications({ userId, sessionId, orders: createdOrders }),
    ]);
    await redis.del(getSessionKey(sessionId), session.lookupKey);

    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
};
