import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@error-handler";
import { normalizeImageAsset } from "@libs/imageAssets";
import { clearAuthCookies } from "../utils/cookies/cookie.util";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
};

const getCustomerId = (req: Request) => {
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

const normalizeProfileAvatar = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return normalizeProfileAvatar(value[0]);
  }

  if (typeof value === "string") {
    const url = value.trim();
    return url ? { url, fileId: "external-image" } : null;
  }

  return normalizeImageAsset(value);
};

const parseProfileAvatarUpdate = (value: unknown) => {
  if (value === null) {
    return null;
  }

  const avatar = normalizeProfileAvatar(value);

  if (!avatar) {
    throw new ValidationError("Invalid avatar image");
  }

  return avatar;
};

const serializeUser = (user: any) => {
  const avatar = normalizeProfileAvatar(user.avatar);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar,
    avatarUrl: avatar?.url || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const fetchSafeUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return serializeUser(user);
};

const getRequiredString = (
  body: Record<string, unknown>,
  key: string,
  label: string,
) => {
  const value = body[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${label} is required`);
  }

  return value.trim();
};

const getOptionalString = (
  body: Record<string, unknown>,
  key: string,
) => {
  const value = body[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseAddressPayload = (
  body: Record<string, unknown>,
  partial = false,
) => {
  const data: Record<string, unknown> = {};

  const requiredFields = [
    ["fullName", "Full name"],
    ["phone", "Phone"],
    ["addressLine1", "Address line 1"],
    ["city", "City"],
    ["postalCode", "Postal code"],
    ["country", "Country"],
  ] as const;

  requiredFields.forEach(([key, label]) => {
    if (!partial || key in body) {
      data[key] = getRequiredString(body, key, label);
    }
  });

  if ("addressLine2" in body) {
    data.addressLine2 = getOptionalString(body, "addressLine2");
  }

  if ("state" in body) {
    data.state = getOptionalString(body, "state");
  }

  if (body.isDefault === true) {
    data.isDefault = true;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("No address fields provided");
  }

  return data;
};

const serializeAddress = (address: any) => ({
  id: address.id,
  userId: address.userId,
  fullName: address.fullName,
  phone: address.phone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  isDefault: address.isDefault,
  createdAt: address.createdAt,
  updatedAt: address.updatedAt,
});

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

const runAddressWrite = async <T>(
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

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const user = await fetchSafeUser(userId);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const name = getRequiredString(req.body, "name", "Name");

    if (name.length < 2) {
      throw new ValidationError("Name must be at least 2 characters");
    }

    const data: Record<string, unknown> = { name };

    if ("avatar" in req.body) {
      data.avatar = parseProfileAvatarUpdate(req.body.avatar);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: SAFE_USER_SELECT,
    });

    return res.status(200).json({
      success: true,
      user: serializeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const getShippingAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const addresses = await prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return res.status(200).json({
      success: true,
      addresses: addresses.map(serializeAddress),
    });
  } catch (error) {
    return next(error);
  }
};

export const createShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const addressData = parseAddressPayload(req.body);
    const addressCount = await prisma.shippingAddress.count({
      where: { userId },
    });
    const shouldBeDefault =
      addressData.isDefault === true || addressCount === 0;

    const address = await runAddressWrite(async (client) => {
      if (shouldBeDefault) {
        await client.shippingAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const createdAddress = await client.shippingAddress.create({
        data: {
          ...addressData,
          userId,
          isDefault: shouldBeDefault,
        },
      });

      if (shouldBeDefault) {
        await client.shippingAddress.updateMany({
          where: {
            userId,
            id: { not: createdAddress.id },
          },
          data: { isDefault: false },
        });
      }

      return createdAddress;
    });

    return res.status(201).json({
      success: true,
      address: serializeAddress(address),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const { id } = req.params;
    const existingAddress = await prisma.shippingAddress.findFirst({
      where: { id, userId },
    });

    if (!existingAddress) {
      throw new NotFoundError("Shipping address not found");
    }

    const addressData = parseAddressPayload(req.body, true);
    const shouldBeDefault = addressData.isDefault === true;

    const address = await runAddressWrite(async (client) => {
      if (shouldBeDefault) {
        await client.shippingAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const updateData = {
        ...addressData,
      };

      if (shouldBeDefault) {
        updateData.isDefault = true;
      } else {
        delete updateData.isDefault;
      }

      const updatedAddress = await client.shippingAddress.update({
        where: { id },
        data: updateData,
      });

      if (shouldBeDefault) {
        await client.shippingAddress.updateMany({
          where: {
            userId,
            id: { not: updatedAddress.id },
          },
          data: { isDefault: false },
        });
      }

      return updatedAddress;
    });

    return res.status(200).json({
      success: true,
      address: serializeAddress(address),
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const { id } = req.params;
    const address = await prisma.shippingAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundError("Shipping address not found");
    }

    await runAddressWrite(async (client) => {
      await client.shippingAddress.delete({ where: { id } });

      if (address.isDefault) {
        const nextDefaultAddress = await client.shippingAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });

        if (nextDefaultAddress) {
          await client.shippingAddress.update({
            where: { id: nextDefaultAddress.id },
            data: { isDefault: true },
          });

          await client.shippingAddress.updateMany({
            where: {
              userId,
              id: { not: nextDefaultAddress.id },
            },
            data: { isDefault: false },
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Shipping address deleted",
    });
  } catch (error) {
    return next(error);
  }
};

export const setDefaultShippingAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getCustomerId(req);
    const { id } = req.params;
    const existingAddress = await prisma.shippingAddress.findFirst({
      where: { id, userId },
    });

    if (!existingAddress) {
      throw new NotFoundError("Shipping address not found");
    }

    const address = await runAddressWrite(async (client) => {
      await client.shippingAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      const defaultAddress = await client.shippingAddress.update({
        where: { id },
        data: { isDefault: true },
      });

      await client.shippingAddress.updateMany({
        where: {
          userId,
          id: { not: defaultAddress.id },
        },
        data: { isDefault: false },
      });

      return defaultAddress;
    });

    return res.status(200).json({
      success: true,
      address: serializeAddress(address),
    });
  } catch (error) {
    return next(error);
  }
};
