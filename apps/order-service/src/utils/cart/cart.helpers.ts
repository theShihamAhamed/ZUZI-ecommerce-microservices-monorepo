import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import { getProductEffectivePricing } from "@libs/product-pricing";
import { isObjectIdLike } from "../order/order.helpers";

type SelectedOptions = Record<string, string> | null;

export interface CartItemInput {
  productId: string;
  quantity: number;
  selectedOptions: SelectedOptions;
  selectedOptionsKey: string;
}

const CART_EMPTY_OPTIONS_KEY = "{}";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeSelectedOptions = (
  selectedOptions?: unknown,
): SelectedOptions => {
  if (!isRecord(selectedOptions)) return null;

  const normalizedOptions = Object.keys(selectedOptions)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((result, key) => {
      const optionName = key.trim();
      const optionValue = selectedOptions[key];

      if (!optionName || typeof optionValue !== "string") {
        return result;
      }

      const trimmedValue = optionValue.trim();
      if (!trimmedValue) return result;

      result[optionName] = trimmedValue;
      return result;
    }, {});

  return Object.keys(normalizedOptions).length > 0 ? normalizedOptions : null;
};

export const getSelectedOptionsKey = (selectedOptions: SelectedOptions) => {
  if (!selectedOptions) return CART_EMPTY_OPTIONS_KEY;

  const entries = Object.entries(selectedOptions);
  return entries.length > 0 ? JSON.stringify(entries) : CART_EMPTY_OPTIONS_KEY;
};

export const normalizeCartItemInput = (payload: unknown): CartItemInput => {
  if (!isRecord(payload)) {
    throw new ValidationError("Cart item is required");
  }

  const productId =
    typeof payload.productId === "string"
      ? payload.productId
      : typeof payload.id === "string"
        ? payload.id
        : "";

  if (!isObjectIdLike(productId)) {
    throw new ValidationError("Invalid product ID");
  }

  const parsedQuantity = Math.floor(Number(payload.quantity));
  if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
    throw new ValidationError("Invalid product quantity");
  }

  const selectedOptions = normalizeSelectedOptions(payload.selectedOptions);

  return {
    productId,
    quantity: parsedQuantity,
    selectedOptions,
    selectedOptionsKey: getSelectedOptionsKey(selectedOptions),
  };
};

const getCartItemKey = (item: Pick<CartItemInput, "productId" | "selectedOptionsKey">) =>
  `${item.productId}:${item.selectedOptionsKey}`;

export const mergeCartItems = (
  currentItems: CartItemInput[],
  incomingItems: CartItemInput[],
) => {
  const now = new Date();
  const merged = new Map<
    string,
    CartItemInput & { createdAt: Date; updatedAt: Date }
  >();

  currentItems.forEach((item) => {
    merged.set(getCartItemKey(item), {
      ...item,
      createdAt: now,
      updatedAt: now,
    });
  });

  incomingItems.forEach((item) => {
    const key = getCartItemKey(item);
    const existingItem = merged.get(key);

    if (existingItem) {
      existingItem.quantity += item.quantity;
      existingItem.updatedAt = now;
      return;
    }

    merged.set(key, {
      ...item,
      createdAt: now,
      updatedAt: now,
    });
  });

  return Array.from(merged.values());
};

export const assertProductsExist = async (items: CartItemInput[]) => {
  const productIds = [...new Set(items.map((item) => item.productId))];

  if (productIds.length === 0) return;

  const products = await prisma.products.findMany({
    where: {
      id: { in: productIds },
      isDeleted: false,
      status: "Active",
    },
    select: { id: true },
  });
  const existingProductIds = new Set(products.map((product) => product.id));
  const missingProductId = productIds.find((id) => !existingProductIds.has(id));

  if (missingProductId) {
    throw new NotFoundError("Product not found");
  }
};

export const getOrCreateCart = async (userId: string) => {
  const existingCart = await prisma.cart.findUnique({ where: { userId } });

  if (existingCart) return existingCart;

  return prisma.cart.create({
    data: {
      userId,
      items: [],
    },
  });
};

export const hydrateCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);
  const productIds = [...new Set(cart.items.map((item) => item.productId))];

  if (productIds.length === 0) {
    return {
      items: [],
      subtotal: 0,
    };
  }

  const products = await prisma.products.findMany({
    where: {
      id: { in: productIds },
      isDeleted: false,
      status: "Active",
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          category: true,
          ratings: true,
          avatar: true,
          coverBanner: true,
          address: true,
        },
      },
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const hydratedItems = cart.items.flatMap((item) => {
    const product = productById.get(item.productId);

    if (!product) return [];

    const pricing = getProductEffectivePricing(product);

    return [
      {
        ...product,
        quantity: item.quantity,
        unitPrice: pricing.effectivePrice,
        regularPrice: pricing.basePrice,
        normalSalePrice: pricing.normalSalePrice,
        eventSalePrice: pricing.eventSalePrice,
        effectivePrice: pricing.effectivePrice,
        activePriceSource: pricing.activePriceSource,
        eventStatus: pricing.eventStatus,
        lineTotal: pricing.effectivePrice * item.quantity,
        userId,
        location: "",
        deviceInfo: "",
        addedAt: item.createdAt.toISOString(),
        selectedOptions:
          item.selectedOptions && isRecord(item.selectedOptions)
            ? (item.selectedOptions as Record<string, string>)
            : null,
        selectedOptionsKey: item.selectedOptionsKey,
      },
    ];
  });

  if (hydratedItems.length !== cart.items.length) {
    await prisma.cart.update({
      where: { userId },
      data: {
        items: cart.items.filter((item) => productById.has(item.productId)),
      },
    });
  }

  return {
    items: hydratedItems,
    subtotal: hydratedItems.reduce(
      (total, item) => total + item.effectivePrice * item.quantity,
      0,
    ),
  };
};

export const getStoredCartItems = async (userId: string) => {
  const cart = await getOrCreateCart(userId);

  return cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    selectedOptions:
      item.selectedOptions && isRecord(item.selectedOptions)
        ? (item.selectedOptions as Record<string, string>)
        : null,
    selectedOptionsKey: item.selectedOptionsKey,
  }));
};
