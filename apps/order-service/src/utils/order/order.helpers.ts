import crypto from "crypto";
import { Request } from "express";
import Stripe from "stripe";
import prisma from "@libs/prisma";
import redis from "@libs/redis";
import { sendEmail } from "@utils/email";
import { getProductThumbnail } from "@libs/imageAssets";
import { getProductEffectivePricing } from "@libs/product-pricing";
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@error-handler";
import { CURRENCY } from "./order.constants";
import {
  CreatedOrderSummary,
  NormalizedCartItem,
  OrderStatusValue,
  PaymentSessionData,
  SelectedOptions,
  ShippingAddressSnapshot,
  ShopOrderGroup,
  StatusHistoryEntry,
  TrustedCartSummary,
  TrustedCheckout,
  TrustedOrderItem,
} from "./order.types";
import { publishOrderNotifications } from "../notification.publisher";

export const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-01-28.clover",
  });
};

export const getCustomerId = (req: Request) => {
  const role = (req as any).role;
  const user = (req as any).user;

  if (role !== "user") {
    throw new ForbiddenError("Customer account required");
  }

  if (!user?.id) {
    throw new AuthError("Unauthorized");
  }

  return user.id as string;
};

export const getSellerId = (req: Request) => {
  const role = (req as any).role;
  const user = (req as any).user;

  if (role !== "seller") {
    throw new ForbiddenError("Seller account required");
  }

  if (!user?.id) {
    throw new AuthError("Unauthorized");
  }

  return user.id as string;
};

export const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value : undefined;
};

export const getPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(getQueryString(value));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const getPagination = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    totalCount: total,
    totalItems: total,
    currentPage: page,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

export const getAllowedStatusFilter = (
  status?: string,
): OrderStatusValue | undefined => {
  const allowedStatuses = new Set<OrderStatusValue>([
    "Ordered",
    "Packed",
    "Paid",
    "Processing",
    "Shipped",
    "OutForDelivery",
    "Delivered",
    "Cancelled",
    "Refunded",
  ]);

  return status && allowedStatuses.has(status as OrderStatusValue)
    ? (status as OrderStatusValue)
    : undefined;
};

export const toCents = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
};

export const toAmount = (cents: number) => {
  return Number((cents / 100).toFixed(2));
};

export const createOrderGroupId = () => `grp_${crypto.randomUUID()}`;

export const createOrderNumber = (index: number) => {
  const dateCode = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `ZUZI-${dateCode}-${randomCode}-${String(index + 1).padStart(2, "0")}`;
};

export const createStatusHistoryEntry = (
  status: OrderStatusValue,
  message: string,
): StatusHistoryEntry => ({
  status,
  label: status === "OutForDelivery" ? "Out for Delivery" : status,
  message,
  createdAt: new Date().toISOString(),
});

const getShippingSummary = (snapshot: unknown) => {
  const address = snapshot as Partial<ShippingAddressSnapshot> | null;

  if (!address) {
    return null;
  }

  return {
    fullName: address.fullName || "",
    phone: address.phone || "",
    line: [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ]
      .filter(Boolean)
      .join(", "),
  };
};

const sortJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortJsonValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
};

const stableStringify = (value: unknown) => {
  return JSON.stringify(sortJsonValue(value));
};

const getSelectedOptions = (value: unknown): SelectedOptions => {
  if (value === undefined || value === null) {
    return null;
  }

  if (Array.isArray(value) || typeof value !== "object") {
    throw new ValidationError("Selected options must be an object");
  }

  const normalizedOptions = Object.keys(value as Record<string, unknown>)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((result, key) => {
      const optionName = key.trim();
      const optionValue = (value as Record<string, unknown>)[key];

      if (!optionName) {
        return result;
      }

      if (typeof optionValue !== "string") {
        throw new ValidationError("Selected option values must be strings");
      }

      const trimmedValue = optionValue.trim();

      if (!trimmedValue) {
        return result;
      }

      result[optionName] = trimmedValue;
      return result;
    }, {});

  return Object.keys(normalizedOptions).length > 0 ? normalizedOptions : null;
};

const normalizeCartItems = (items: unknown): NormalizedCartItem[] => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError("Cart items are required");
  }

  const normalized = new Map<string, NormalizedCartItem>();

  items.forEach((item) => {
    if (!item || typeof item !== "object") {
      throw new ValidationError("Invalid cart item");
    }

    const { quantity, selectedOptions } = item as Record<string, unknown>;
    const id =
      typeof (item as Record<string, unknown>).id === "string"
        ? (item as Record<string, unknown>).id
        : (item as Record<string, unknown>).productId;

    if (typeof id !== "string" || !isObjectIdLike(id)) {
      throw new ValidationError("Invalid product ID");
    }

    const parsedQuantity = Math.floor(Number(quantity));

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      throw new ValidationError("Invalid product quantity");
    }

    const safeSelectedOptions = getSelectedOptions(selectedOptions);
    const selectedOptionsKey = stableStringify(safeSelectedOptions || {});
    const mapKey = `${id}:${selectedOptionsKey}`;
    const existingItem = normalized.get(mapKey);

    if (existingItem) {
      existingItem.quantity += parsedQuantity;
      return;
    }

    normalized.set(mapKey, {
      id,
      quantity: parsedQuantity,
      selectedOptions: safeSelectedOptions,
      selectedOptionsKey,
    });
  });

  return Array.from(normalized.values()).sort((a, b) => {
    if (a.id === b.id) {
      return a.selectedOptionsKey.localeCompare(b.selectedOptionsKey);
    }

    return a.id.localeCompare(b.id);
  });
};

interface ProductOptionGroup {
  id: string;
  name: string;
  values: string[];
  required: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeStringList = (values: unknown) => {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (typeof value !== "string") return [];

    const trimmed = value.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) return [];

    seen.add(key);
    return [trimmed];
  });
};

const addProductOptionGroup = (
  groups: ProductOptionGroup[],
  seenNames: Set<string>,
  group: Partial<ProductOptionGroup>,
  requiredFallback: boolean,
) => {
  const name = typeof group.name === "string" ? group.name.trim() : "";
  const values = normalizeStringList(group.values);

  if (!name || values.length === 0) return;

  const key = name.toLowerCase();
  if (seenNames.has(key)) return;

  seenNames.add(key);
  groups.push({
    id:
      typeof group.id === "string" && group.id.trim()
        ? group.id.trim()
        : key,
    name,
    values,
    required:
      typeof group.required === "boolean" ? group.required : requiredFallback,
  });
};

const getProductOptionGroupsForValidation = (product: any) => {
  const groups: ProductOptionGroup[] = [];
  const seenNames = new Set<string>();
  const customProperties = isRecord(product.custom_properties)
    ? product.custom_properties
    : {};
  const rawOptionGroups = customProperties.optionGroups;

  if (Array.isArray(rawOptionGroups)) {
    rawOptionGroups.forEach((group) => {
      if (isRecord(group)) {
        addProductOptionGroup(groups, seenNames, group, true);
      }
    });
  }

  addProductOptionGroup(
    groups,
    seenNames,
    {
      id: "legacy-color",
      name: "Color",
      values: product.colors,
      required: false,
    },
    false,
  );

  addProductOptionGroup(
    groups,
    seenNames,
    {
      id: "legacy-size",
      name: "Size",
      values: product.sizes,
      required: false,
    },
    false,
  );

  return groups;
};

const validateSelectedOptions = (
  product: any,
  selectedOptions: SelectedOptions,
) => {
  const optionGroups = getProductOptionGroupsForValidation(product);

  if (optionGroups.length === 0) {
    if (selectedOptions) {
      throw new ValidationError(`Invalid options selected for ${product.title}`);
    }

    return;
  }

  const selectedOptionsByName = new Map(
    Object.entries(selectedOptions || {}).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  const optionGroupsByName = new Map(
    optionGroups.map((group) => [group.name.toLowerCase(), group]),
  );

  optionGroups.forEach((group) => {
    const selectedValue = selectedOptionsByName.get(group.name.toLowerCase());

    if (group.required && !selectedValue) {
      throw new ValidationError(`Select ${group.name} for ${product.title}`);
    }

    if (selectedValue && !group.values.includes(selectedValue)) {
      throw new ValidationError(
        `Invalid ${group.name} selected for ${product.title}`,
      );
    }
  });

  Object.keys(selectedOptions || {}).forEach((selectedName) => {
    if (!optionGroupsByName.has(selectedName.toLowerCase())) {
      throw new ValidationError(
        `Invalid option ${selectedName} selected for ${product.title}`,
      );
    }
  });
};

export const getCartHash = (data: {
  normalizedCart: NormalizedCartItem[];
  shippingAddressId: string;
  couponCode: string | null;
}) => {
  return crypto
    .createHash("sha256")
    .update(stableStringify(data))
    .digest("hex");
};

export const getSessionKey = (sessionId: string) => `payment-session:${sessionId}`;

export const getLookupKey = (userId: string, cartHash: string) =>
  `payment-session-user:${userId}:${cartHash}`;

export const getSessionData = async (
  sessionId: string,
): Promise<PaymentSessionData | null> => {
  const rawSession = await redis.get(getSessionKey(sessionId));

  if (!rawSession) {
    return null;
  }

  return JSON.parse(rawSession) as PaymentSessionData;
};

export const buildSummary = (checkout: {
  subtotalCents: number;
  discountAmountCents: number;
  totalCents: number;
  currency: string;
  shopGroups?: ShopOrderGroup[];
}) => ({
  subtotal: toAmount(checkout.subtotalCents),
  discountAmount: toAmount(checkout.discountAmountCents),
  total: toAmount(checkout.totalCents),
  currency: checkout.currency,
  shops:
    checkout.shopGroups?.map((group) => ({
      shopId: group.shopId,
      subtotal: toAmount(group.subtotalCents),
      discountAmount: toAmount(group.discountAmountCents),
      total: toAmount(group.totalCents),
      items: group.items.map((item) => ({
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
        total: toAmount(item.totalAmountCents),
      })),
    })) || [],
});

export const buildTrustedCartSummary = async ({
  items,
  couponCode,
}: {
  items: unknown;
  couponCode?: unknown;
}): Promise<TrustedCartSummary> => {
  const normalizedCart = normalizeCartItems(items);
  const productIds = [...new Set(normalizedCart.map((item) => item.id))];
  const products = await prisma.products.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      title: true,
      stock: true,
      regular_price: true,
      sale_price: true,
      event_sale_price: true,
      isEvent: true,
      starting_date: true,
      ending_date: true,
      status: true,
      isDeleted: true,
      colors: true,
      sizes: true,
      custom_properties: true,
      discount_codes: true,
      shopId: true,
      images: true,
      shop: {
        select: {
          id: true,
          sellerId: true,
          seller: {
            select: {
              id: true,
              stripeId: true,
            },
          },
        },
      },
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  if (products.length !== productIds.length) {
    throw new ValidationError("One or more products are unavailable");
  }

  const internalItems = normalizedCart.map((cartItem) => {
    const product = productById.get(cartItem.id);

    if (!product) {
      throw new ValidationError("Product is unavailable");
    }

    if (product.status !== "Active" || product.isDeleted) {
      throw new ValidationError(`${product.title} is not available`);
    }

    if (product.stock < cartItem.quantity) {
      throw new ValidationError(`Only ${product.stock} ${product.title} available`);
    }

    if (!product.shop || !product.shop.seller) {
      throw new ValidationError(`${product.title} is missing seller information`);
    }

    validateSelectedOptions(product, cartItem.selectedOptions);

    const pricing = getProductEffectivePricing(product);
    const unitAmountCents = toCents(pricing.effectivePrice);
    const regularAmountCents = toCents(pricing.basePrice);
    const normalSaleAmountCents = toCents(pricing.normalSalePrice);
    const eventSaleAmountCents =
      pricing.eventSalePrice === null ? null : toCents(pricing.eventSalePrice);

    if (unitAmountCents <= 0) {
      throw new ValidationError(`${product.title} has an invalid price`);
    }

    return {
      productId: product.id,
      title: product.title,
      imageUrl: getProductThumbnail(product),
      shopId: product.shopId,
      sellerId: product.shop.sellerId,
      sellerStripeId: product.shop.seller.stripeId,
      quantity: cartItem.quantity,
      unitAmountCents,
      regularAmountCents,
      normalSaleAmountCents,
      eventSaleAmountCents,
      activePriceSource: pricing.activePriceSource,
      eventStatus: pricing.eventStatus,
      subtotalCents: unitAmountCents * cartItem.quantity,
      discountAmountCents: 0,
      totalAmountCents: unitAmountCents * cartItem.quantity,
      selectedOptions: cartItem.selectedOptions,
      discountCodeIds: product.discount_codes,
    };
  });

  const subtotalCents = internalItems.reduce(
    (total, item) => total + item.subtotalCents,
    0,
  );
  let coupon = null;
  let discountAmountCents = 0;
  const normalizedCouponCode =
    typeof couponCode === "string" ? couponCode.trim() : "";

  if (normalizedCouponCode) {
    const discountCode = await prisma.discount_codes.findUnique({
      where: {
        discountCode: normalizedCouponCode,
      },
    });

    if (!discountCode) {
      throw new ValidationError("Invalid coupon code");
    }

    const eligibleItems = internalItems.filter(
      (item) =>
        item.sellerId === discountCode.sellerId &&
        item.discountCodeIds.includes(discountCode.id),
    );
    const eligibleSubtotalCents = eligibleItems.reduce(
      (total, item) => total + item.subtotalCents,
      0,
    );

    if (eligibleSubtotalCents <= 0) {
      throw new ValidationError("Coupon is not valid for these products");
    }

    const discountValue = Number(discountCode.discountValue);

    if (discountCode.discountType === "percentage") {
      const percent = Math.min(Math.max(discountValue, 0), 100);
      discountAmountCents = Math.round((eligibleSubtotalCents * percent) / 100);
    } else {
      discountAmountCents = Math.min(toCents(discountValue), eligibleSubtotalCents);
    }

    let remainingDiscountCents = discountAmountCents;

    eligibleItems.forEach((item, index) => {
      const isLastItem = index === eligibleItems.length - 1;
      const itemDiscountCents = isLastItem
        ? remainingDiscountCents
        : Math.floor(
            (discountAmountCents * item.subtotalCents) / eligibleSubtotalCents,
          );

      item.discountAmountCents = itemDiscountCents;
      item.totalAmountCents = item.subtotalCents - itemDiscountCents;
      remainingDiscountCents -= itemDiscountCents;
    });

    coupon = {
      id: discountCode.id,
      code: discountCode.discountCode,
      sellerId: discountCode.sellerId,
      discountType: discountCode.discountType,
      discountValue,
      eligibleSubtotalCents,
      discountAmountCents,
    };
  }

  const trustedItems: TrustedOrderItem[] = internalItems.map((item) => ({
    productId: item.productId,
    title: item.title,
    imageUrl: item.imageUrl,
    shopId: item.shopId,
    sellerId: item.sellerId,
    sellerStripeId: item.sellerStripeId,
    quantity: item.quantity,
    unitAmountCents: item.unitAmountCents,
    regularAmountCents: item.regularAmountCents,
    normalSaleAmountCents: item.normalSaleAmountCents,
    eventSaleAmountCents: item.eventSaleAmountCents,
    activePriceSource: item.activePriceSource,
    eventStatus: item.eventStatus,
    subtotalCents: item.subtotalCents,
    discountAmountCents: item.discountAmountCents,
    totalAmountCents: item.totalAmountCents,
    selectedOptions: item.selectedOptions,
  }));
  const groupByShop = new Map<string, ShopOrderGroup>();

  trustedItems.forEach((item) => {
    const existingGroup = groupByShop.get(item.shopId);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.subtotalCents += item.subtotalCents;
      existingGroup.discountAmountCents += item.discountAmountCents;
      existingGroup.totalCents += item.totalAmountCents;
      return;
    }

    groupByShop.set(item.shopId, {
      shopId: item.shopId,
      sellerId: item.sellerId,
      sellerStripeId: item.sellerStripeId,
      subtotalCents: item.subtotalCents,
      discountAmountCents: item.discountAmountCents,
      totalCents: item.totalAmountCents,
      items: [item],
    });
  });

  const totalCents = subtotalCents - discountAmountCents;

  if (totalCents <= 0) {
    throw new ValidationError("Order total must be greater than zero");
  }

  return {
    normalizedCart,
    trustedItems,
    shopGroups: Array.from(groupByShop.values()),
    coupon,
    subtotalCents,
    discountAmountCents,
    totalCents,
    currency: CURRENCY,
  };
};

export const buildTrustedCheckout = async ({
  userId,
  items,
  shippingAddressId,
  couponCode,
}: {
  userId: string;
  items: unknown;
  shippingAddressId: unknown;
  couponCode?: unknown;
}): Promise<TrustedCheckout> => {
  if (typeof shippingAddressId !== "string" || !isObjectIdLike(shippingAddressId)) {
    throw new ValidationError("Shipping address is required");
  }

  const [shippingAddress, trustedCartSummary] = await Promise.all([
    prisma.shippingAddress.findFirst({
      where: {
        id: shippingAddressId,
        userId,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
      },
    }),
    buildTrustedCartSummary({ items, couponCode }),
  ]);

  if (!shippingAddress) {
    throw new NotFoundError("Shipping address not found");
  }

  return {
    ...trustedCartSummary,
    shippingAddressId,
    shippingAddressSnapshot: {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    },
  };
};

export const mapStripePaymentStatus = (
  status?: Stripe.PaymentIntent.Status,
): "Pending" | "Succeeded" | "Failed" | "Refunded" => {
  switch (status) {
    case "succeeded":
      return "Succeeded";
    case "canceled":
      return "Failed";
    default:
      return "Pending";
  }
};

const isTransactionUnsupportedError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("transaction numbers are only allowed") ||
    message.includes("replica set") ||
    message.includes("transactions are not supported")
  );
};

// MongoDB transactions require a replica set. The fallback keeps local/dev usable.
export const runOrderWrite = async <T>(
  operation: (client: any) => Promise<T>,
) => {
  try {
    return await prisma.$transaction(async (tx) => operation(tx));
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      return operation(prisma);
    }

    throw error;
  }
};

export const updateAnalyticsAfterOrder = async (items: TrustedOrderItem[]) => {
  try {
    await Promise.all(
      items.map((item) =>
        prisma.productAnalytics.upsert({
          where: {
            productId: item.productId,
          },
          update: {
            purchases: {
              increment: item.quantity,
            },
          },
          create: {
            productId: item.productId,
            shopId: item.shopId,
            purchases: item.quantity,
          },
        }),
      ),
    );
  } catch (error) {
    console.error("Order analytics update failed:", error);
  }
};

const getShopNameById = async (shopIds: string[]) => {
  const shops = await prisma.shop.findMany({
    where: {
      id: {
        in: [...new Set(shopIds)],
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return new Map(shops.map((shop) => [shop.id, shop.name]));
};

const escapeHtml = (value: unknown) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const sendBuyerOrderConfirmation = async ({
  userId,
  sessionId,
  orders,
}: {
  userId: string;
  sessionId: string;
  orders: CreatedOrderSummary[];
}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });

    if (!user?.email) {
      return;
    }

    const shopNameById = await getShopNameById(orders.map((order) => order.shopId));
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const orderRows = orders
      .map((order) => {
        const orderLabel = escapeHtml(order.orderNumber || order.id);
        const shopName = escapeHtml(
          shopNameById.get(order.shopId) || "Zuzi seller",
        );
        const items = order.items
          .map(
            (item) =>
              `<li>${escapeHtml(item.title)} x ${item.quantity} - $${toAmount(
                item.totalAmountCents,
              ).toFixed(2)}</li>`,
          )
          .join("");

        return `
          <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e7e5e4;">
            <h3 style="margin:0 0 8px;">${orderLabel}</h3>
            <p style="margin:0 0 8px;">Shop: ${shopName}</p>
            <ul style="margin:0 0 8px;padding-left:20px;">${items}</ul>
            <p style="margin:0 0 8px;font-weight:700;">Total: $${order.total.toFixed(
              2,
            )}</p>
            <a href="${clientUrl}/profile/orders/${order.id}">View order</a>
          </div>
        `;
      })
      .join("");
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;">
        <h2 style="margin:0 0 12px;">Thanks for your order, ${escapeHtml(user.name)}</h2>
        <p style="margin:0 0 16px;">Your payment was successful and your order has been placed.</p>
        ${orderRows}
        <p style="margin:16px 0 0;">Payment status: Succeeded</p>
      </div>
    `;
    const sent = await sendEmail({
      to: user.email,
      subject: "Your Zuzi order confirmation",
      html,
    });

    if (sent) {
      await prisma.orderPayment.update({
        where: { sessionId },
        data: {
          buyerEmailSentAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Buyer order confirmation email failed:", error);
  }
};

export const createOrderNotifications = async ({
  userId,
  sessionId,
  orders,
}: {
  userId: string;
  sessionId: string;
  orders: CreatedOrderSummary[];
}) => {
  try {
    await publishOrderNotifications(
      orders.map((order) => ({
        recipientType: "seller",
        recipientId: order.sellerId,
        type: "NEW_ORDER",
        title: "New order received",
        message: `You received a new order${
          order.orderNumber ? ` ${order.orderNumber}` : ""
        }.`,
        redirectUrl: `/dashboard/orders/${order.id}`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderGroupId: order.orderGroupId,
          total: order.total,
        },
        dedupeKey: `seller:new-order:${order.sellerId}:${order.id}`,
      })),
    );

    await Promise.all(
      orders.map((order) =>
        prisma.orders.update({
          where: { id: order.id },
          data: {
            sellerNotificationCreatedAt: new Date(),
          },
        }),
      ),
    );
  } catch (error) {
    console.error("Seller order notification failed:", error);
  }

  try {
    const firstOrder = orders[0];

    if (firstOrder) {
      const orderLabel =
        orders.length === 1
          ? firstOrder.orderNumber || firstOrder.id
          : firstOrder.orderGroupId;
      const total = Number(
        orders.reduce((sum, order) => sum + order.total, 0).toFixed(2),
      );

      await publishOrderNotifications([
        {
          recipientType: "user",
          recipientId: userId,
          type: "ORDER_PLACED",
          title: "Order placed successfully",
          message: `Your order ${orderLabel} has been placed successfully.`,
          redirectUrl: "/profile/orders",
          data: {
            orderIds: orders.map((order) => order.id),
            orderGroupId: firstOrder.orderGroupId,
            paymentStatus: "Succeeded",
            total,
          },
          dedupeKey: `user:order-placed:${userId}:${firstOrder.orderGroupId}`,
        },
      ]);
    }
  } catch (error) {
    console.error("User order notification failed:", error);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.notifications.create({
      data: {
        creatorId: userId,
        receiverRole: "admin",
        title: "Platform Order Alert",
        message: `A new order was placed by ${user?.name || "a customer"}.`,
        redirect_link: "/admin/orders",
        type: "order",
      },
    });

    await prisma.orderPayment.update({
      where: { sessionId },
      data: {
        adminNotificationCreatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Admin order notification failed:", error);
  }
};

const publicShopSelect = {
  id: true,
  name: true,
  category: true,
  ratings: true,
  avatar: true,
  coverBanner: true,
  address: true,
};

const getShippingSnapshotsByAddressId = async (orders: any[]) => {
  const addressIds = [
    ...new Set(
      orders
        .filter((order) => !order.shippingAddressSnapshot)
        .map((order) => order.shippingAddressId)
        .filter(Boolean),
    ),
  ];

  if (addressIds.length === 0) {
    return new Map<string, ShippingAddressSnapshot>();
  }

  const addresses = await prisma.shippingAddress.findMany({
    where: {
      id: {
        in: addressIds,
      },
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
    },
  });

  return new Map(
    addresses.map((address) => [
      address.id,
      {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
    ]),
  );
};

const getOrderShippingSnapshot = (
  order: any,
  fallbackSnapshots: Map<string, ShippingAddressSnapshot>,
) => {
  return (
    (order.shippingAddressSnapshot as ShippingAddressSnapshot | null) ||
    (order.shippingAddressId
      ? fallbackSnapshots.get(order.shippingAddressId) || null
      : null)
  );
};

type OrderPayloadOptions = {
  includeCustomerReviewRequestsForUserId?: string;
};

const isDeliveredPaidOrder = (order: any) =>
  order.status === "Delivered" && order.paymentStatus === "Succeeded";

const serializeReviewRequestForOrderItem = ({
  request,
  reviewId,
  order,
}: {
  request?: {
    publicId: string;
    status: string;
    expiresAt: Date;
    usedAt?: Date | null;
    reviewId?: string | null;
  };
  reviewId?: string | null;
  order: any;
}) => {
  const effectiveStatus =
    request?.status === "Pending" && request.expiresAt < new Date()
      ? "Expired"
      : request?.status;
  const hasReview = Boolean(reviewId || request?.reviewId);
  const reviewSubmitted = hasReview || effectiveStatus === "Used";

  return {
    reviewRequest: request
      ? {
          publicId: request.publicId,
          status: effectiveStatus,
          expiresAt: request.expiresAt.toISOString(),
          usedAt: request.usedAt?.toISOString() || null,
          reviewId: request.reviewId || reviewId || null,
          canSubmit:
            effectiveStatus === "Pending" &&
            isDeliveredPaidOrder(order) &&
            !hasReview,
        }
      : undefined,
    hasReview,
    reviewSubmitted,
  };
};

const getReviewMetadataByOrderItemId = async ({
  items,
  orders,
  userId,
}: {
  items: Array<{ id: string; orderId: string }>;
  orders: any[];
  userId?: string;
}) => {
  const metadataByOrderItemId = new Map<
    string,
    ReturnType<typeof serializeReviewRequestForOrderItem>
  >();

  if (!userId || items.length === 0) {
    return metadataByOrderItemId;
  }

  const orderItemIds = items.map((item) => item.id);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const [reviewRequests, reviews] = await Promise.all([
    prisma.reviewRequest.findMany({
      where: {
        userId,
        orderItemId: {
          in: orderItemIds,
        },
      },
      select: {
        publicId: true,
        status: true,
        expiresAt: true,
        usedAt: true,
        reviewId: true,
        orderItemId: true,
      },
    }),
    prisma.productReview.findMany({
      where: {
        userId,
        orderItemId: {
          in: orderItemIds,
        },
      },
      select: {
        id: true,
        orderItemId: true,
      },
    }),
  ]);
  const requestByOrderItemId = new Map(
    reviewRequests.map((request) => [request.orderItemId, request]),
  );
  const reviewIdByOrderItemId = new Map(
    reviews.map((review) => [review.orderItemId, review.id]),
  );

  items.forEach((item) => {
    const order = orderById.get(item.orderId);

    if (!order) return;

    metadataByOrderItemId.set(
      item.id,
      serializeReviewRequestForOrderItem({
        request: requestByOrderItemId.get(item.id),
        reviewId: reviewIdByOrderItemId.get(item.id),
        order,
      }),
    );
  });

  return metadataByOrderItemId;
};

export const getOrdersPayload = async (
  orders: any[],
  options: OrderPayloadOptions = {},
) => {
  const orderIds = orders.map((order) => order.id);
  const shopIds = [...new Set(orders.map((order) => order.shopId))];
  const [items, shops, fallbackSnapshots] = await Promise.all([
    orderIds.length > 0
      ? prisma.orderItems.findMany({
          where: {
            orderId: {
              in: orderIds,
            },
          },
        })
      : [],
    shopIds.length > 0
      ? prisma.shop.findMany({
          where: {
            id: {
              in: shopIds,
            },
          },
          select: publicShopSelect,
        })
      : [],
    getShippingSnapshotsByAddressId(orders),
  ]);
  const reviewMetadataByOrderItemId = await getReviewMetadataByOrderItemId({
    items,
    orders,
    userId: options.includeCustomerReviewRequestsForUserId,
  });
  const itemsByOrderId = new Map<string, typeof items>();
  const shopById = new Map(shops.map((shop) => [shop.id, shop]));

  items.forEach((item) => {
    const currentItems = itemsByOrderId.get(item.orderId) || [];
    currentItems.push(item);
    itemsByOrderId.set(item.orderId, currentItems);
  });

  return orders.map((order) => {
    const orderItems = itemsByOrderId.get(order.id) || [];
    const shippingSnapshot = getOrderShippingSnapshot(order, fallbackSnapshots);
    const reviewMetadata = orderItems.map((item) =>
      reviewMetadataByOrderItemId.get(item.id),
    );
    const reviewRequests = orderItems.flatMap((item) => {
      const metadata = reviewMetadataByOrderItemId.get(item.id);

      return metadata?.reviewRequest
        ? [{ orderItemId: item.id, ...metadata.reviewRequest }]
        : [];
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderGroupId: order.orderGroupId,
      createdAt: order.createdAt,
      shop: shopById.get(order.shopId) || null,
      itemCount: orderItems.reduce(
        (total, item) => total + (item.quantity || 0),
        0,
      ),
      total: order.total,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      status: order.status,
      shippingSummary: getShippingSummary(shippingSnapshot),
      couponCode: order.couponCode,
      discountAmount: order.discountAmount,
      reviewRequests,
      pendingReviewRequestCount: reviewRequests.filter(
        (request) => request.canSubmit,
      ).length,
      reviewSubmittedCount: reviewMetadata.filter(
        (metadata) => metadata?.reviewSubmitted,
      ).length,
      reviewableItemCount: orderItems.length,
    };
  });
};

export const getOrderDetailPayload = async (
  order: any,
  options: OrderPayloadOptions = {},
) => {
  const [items, shop, fallbackSnapshots] = await Promise.all([
    prisma.orderItems.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shop.findUnique({
      where: { id: order.shopId },
      select: publicShopSelect,
    }),
    getShippingSnapshotsByAddressId([order]),
  ]);
  const shippingAddressSnapshot = getOrderShippingSnapshot(
    order,
    fallbackSnapshots,
  );
  const reviewMetadataByOrderItemId = await getReviewMetadataByOrderItemId({
    items,
    orders: [order],
    userId: options.includeCustomerReviewRequestsForUserId,
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderGroupId: order.orderGroupId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shop,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.title,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      selectedOptions: item.selectedOptions,
      ...reviewMetadataByOrderItemId.get(item.id),
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    total: order.total,
    currency: order.currency,
    couponCode: order.couponCode,
    paymentStatus: order.paymentStatus,
    status: order.status,
    shippingAddressSnapshot,
    statusHistory: order.statusHistory || [],
  };
};

export const getAllowedNextStatuses = (status: OrderStatusValue) => {
  const transitions: Record<string, OrderStatusValue[]> = {
    Paid: ["Packed"],
    Processing: ["Packed"],
    Ordered: ["Packed"],
    Packed: ["Shipped"],
    Shipped: ["OutForDelivery"],
    OutForDelivery: ["Delivered"],
    Delivered: [],
    Cancelled: [],
    Refunded: [],
  };

  return transitions[status] || [];
};
