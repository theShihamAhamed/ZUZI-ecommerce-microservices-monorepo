import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import {
  buildSummary,
  buildTrustedCartSummary,
  getCustomerId,
  toAmount,
} from "../utils/order/order.helpers";
import {
  assertProductsExist,
  getStoredCartItems,
  getOrCreateCart,
  getSelectedOptionsKey,
  hydrateCart,
  mergeCartItems,
  normalizeCartItemInput,
  normalizeSelectedOptions,
} from "../utils/cart/cart.helpers";

const getCartItemKey = (item: {
  productId: string;
  selectedOptionsKey: string;
}) => `${item.productId}:${item.selectedOptionsKey}`;

const sendHydratedCart = async (res: Response, userId: string) => {
  const cart = await hydrateCart(userId);

  return res.status(200).json({
    success: true,
    cart: cart.items,
    subtotal: cart.subtotal,
  });
};

const getCartSummaryPayload = (trustedSummary: Awaited<
  ReturnType<typeof buildTrustedCartSummary>
>) => ({
  ...buildSummary(trustedSummary),
  coupon: trustedSummary.coupon
    ? {
        code: trustedSummary.coupon.code,
        valid: true,
        message: "Coupon applied.",
        eligibleSubtotal: toAmount(trustedSummary.coupon.eligibleSubtotalCents),
        discountAmount: toAmount(trustedSummary.coupon.discountAmountCents),
      }
    : null,
  items: trustedSummary.trustedItems.map((item) => ({
    productId: item.productId,
    title: item.title,
    quantity: item.quantity,
    unitPrice: toAmount(item.unitAmountCents),
    regularPrice: toAmount(item.regularAmountCents),
    normalSalePrice: toAmount(item.normalSaleAmountCents),
    eventSalePrice:
      item.eventSaleAmountCents === null
        ? null
        : toAmount(item.eventSaleAmountCents),
    effectivePrice: toAmount(item.unitAmountCents),
    activePriceSource: item.activePriceSource,
    eventStatus: item.eventStatus,
    subtotal: toAmount(item.subtotalCents),
    discountAmount: toAmount(item.discountAmountCents),
    total: toAmount(item.totalAmountCents),
    selectedOptions: item.selectedOptions,
  })),
});

export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    return sendHydratedCart(res, userId);
  } catch (error) {
    return next(error);
  }
};

export const getCartSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const body = req.body as Record<string, unknown>;
    const items = Array.isArray(body?.items)
      ? body.items
      : await getStoredCartItems(userId);
    const trustedSummary = await buildTrustedCartSummary({
      items,
      couponCode: body?.couponCode,
    });

    return res.status(200).json({
      success: true,
      data: getCartSummaryPayload(trustedSummary),
    });
  } catch (error) {
    return next(error);
  }
};

export const addCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const incomingItem = normalizeCartItemInput(req.body);
    await assertProductsExist([incomingItem]);

    const cart = await getOrCreateCart(userId);
    const currentItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedOptions: normalizeSelectedOptions(item.selectedOptions),
      selectedOptionsKey: item.selectedOptionsKey,
    }));

    await prisma.cart.update({
      where: { userId },
      data: {
        items: mergeCartItems(currentItems, [incomingItem]),
      },
    });

    return sendHydratedCart(res, userId);
  } catch (error) {
    return next(error);
  }
};

export const updateCartItemQuantity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const incomingItem = normalizeCartItemInput(req.body);
    await assertProductsExist([incomingItem]);

    const cart = await getOrCreateCart(userId);
    const incomingKey = getCartItemKey(incomingItem);
    let didUpdate = false;

    const nextItems = cart.items.map((item) => {
      const selectedOptions = normalizeSelectedOptions(item.selectedOptions);
      const selectedOptionsKey =
        item.selectedOptionsKey || getSelectedOptionsKey(selectedOptions);

      if (
        getCartItemKey({
          productId: item.productId,
          selectedOptionsKey,
        }) !== incomingKey
      ) {
        return {
          ...item,
          selectedOptions,
          selectedOptionsKey,
        };
      }

      didUpdate = true;
      return {
        ...item,
        quantity: incomingItem.quantity,
        selectedOptions,
        selectedOptionsKey,
        updatedAt: new Date(),
      };
    });

    if (!didUpdate) {
      throw new NotFoundError("Cart item not found");
    }

    await prisma.cart.update({
      where: { userId },
      data: { items: nextItems },
    });

    return sendHydratedCart(res, userId);
  } catch (error) {
    return next(error);
  }
};

export const removeCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const payload =
      req.body && typeof req.body === "object"
        ? { ...req.body, quantity: 1 }
        : {};
    const incomingItem = normalizeCartItemInput(payload);
    const incomingKey = getCartItemKey(incomingItem);
    const cart = await getOrCreateCart(userId);
    const nextItems = cart.items.filter((item) => {
      const selectedOptions = normalizeSelectedOptions(item.selectedOptions);
      const selectedOptionsKey =
        item.selectedOptionsKey || getSelectedOptionsKey(selectedOptions);

      return (
        getCartItemKey({
          productId: item.productId,
          selectedOptionsKey,
        }) !== incomingKey
      );
    });

    if (nextItems.length === cart.items.length) {
      throw new NotFoundError("Cart item not found");
    }

    await prisma.cart.update({
      where: { userId },
      data: { items: nextItems },
    });

    return sendHydratedCart(res, userId);
  } catch (error) {
    return next(error);
  }
};

export const clearCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    await getOrCreateCart(userId);
    await prisma.cart.update({
      where: { userId },
      data: { items: [] },
    });

    return sendHydratedCart(res, userId);
  } catch (error) {
    return next(error);
  }
};

export const syncCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const rawItems = (req.body as Record<string, unknown>)?.items;

    if (!Array.isArray(rawItems)) {
      throw new ValidationError("Cart items are required");
    }

    const incomingItems = rawItems.map(normalizeCartItemInput);
    await assertProductsExist(incomingItems);

    const cart = await getOrCreateCart(userId);
    const currentItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedOptions: normalizeSelectedOptions(item.selectedOptions),
      selectedOptionsKey: item.selectedOptionsKey,
    }));

    await prisma.cart.update({
      where: { userId },
      data: {
        items: mergeCartItems(currentItems, incomingItems),
      },
    });

    return sendHydratedCart(res, userId);
  } catch (error) {
    return next(error);
  }
};
