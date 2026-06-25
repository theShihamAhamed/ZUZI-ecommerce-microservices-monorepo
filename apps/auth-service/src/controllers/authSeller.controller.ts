import { NextFunction, Request, Response } from "express";
import {
  checkOtpRestrictions,
  cleanupRegistrationData,
  getTempRegistration,
  sendOtp,
  storeTempRegistration,
  trackOtpRequests,
  validateRegistrationData,
  verifyOtp,
} from "../utils/auth.helper";
import prisma from "@libs/prisma";
import { AuthError, ValidationError } from "@error-handler";
import {
  generateAccessToken,
  generateRefreshToken,
  generateRegistrationToken,
} from "../utils/token/token.util";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { setAuthCookies } from "../utils/cookies/cookie.util";
import jwt from "jsonwebtoken";
import { getImageUrl, normalizeImageAsset } from "@libs/imageAssets";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-01-28.clover",
});

const normalizeSellerAvatar = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return normalizeSellerAvatar(value[0]);
  }

  if (typeof value === "string") {
    const url = value.trim();
    return url ? { url, fileId: "external-image" } : null;
  }

  return normalizeImageAsset(value);
};

export const sellerRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, "seller");

    const { name, email, password, phone_number, country } = req.body;

    const existingSeller = await prisma.seller.findUnique({
      where: { email },
    });

    if (existingSeller) {
      throw new ValidationError("Seller already exists with this email");
    }

    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(name, email, "user-activation-mail");

    const token = generateRegistrationToken(email);
    const hashedPassword = await bcrypt.hash(password, 10);

    await storeTempRegistration(email, {
      name,
      password: hashedPassword,
      phone_number,
      country,
    });

    res.status(200).json({
      message: "OTP sent to email. Please verify your seller account.",
      registrationToken: token,
    });
  } catch (error) {
    next(error);
  }
};

export const sellerOtpVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { otp } = req.body;
    const email = (req as any).emailFromToken;

    await verifyOtp(email, otp);

    const { name, password, phone_number, country } =
      await getTempRegistration(email);

    if (!phone_number || !country) {
      throw new ValidationError("Phone number and country are required");
    }

    const seller = await prisma.seller.create({
      data: {
        name,
        email,
        password,
        phone_number,
        country,
        status: "EMAIL_VERIFIED",
      },
    });

    await cleanupRegistrationData(email);

    const payload = { userId: seller.id, role: "seller" } as const;

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      sellerId: seller.id,
      message: "Seller account verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const resendSellerOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const email = (req as any).emailFromToken;

    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(email, email, "user-activation-mail");

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    next(error);
  }
};

export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sellerId = (req as any).user.id;
    const { name, bio, address, opening_hours, website, category } = req.body;

    if ((req as any).role !== "seller") {
      throw new AuthError("Only sellers can create shops");
    }

    const shop = await prisma.shop.create({
      data: {
        sellerId,
        name,
        bio,
        address,
        opening_hours,
        website,
        category,
      },
    });

    await prisma.seller.update({
      where: { id: sellerId },
      data: { status: "SHOP_CREATED" },
    });

    res.status(201).json({
      success: true,
      shopId: shop.id,
    });
  } catch (error) {
    next(error);
  }
};

export const connectStripe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const seller = (req as any).user;

    const account = await stripe.accounts.create({
      type: "express",
      email: seller.email,
      country: "GB",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        stripeId: account.id,
        status: "ACTIVE",
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.CLIENT_URL}/stripe/success`,
      return_url: `${process.env.CLIENT_URL}/stripe/success`,
      type: "account_onboarding",
    });

    res.status(200).json({
      url: accountLink.url,
    });
  } catch (error) {
    next(error);
  }
};

export const loginSeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const seller = await prisma.seller.findUnique({
      where: { email },
    });

    if (!seller || !seller.password) {
      throw new ValidationError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, seller.password);

    if (!isPasswordValid) {
      throw new ValidationError("Invalid email or password");
    }

    const payload = { userId: seller.id, role: "seller" } as const;

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookies(res, accessToken, refreshToken);

    const avatar = normalizeSellerAvatar(seller.avatar);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        avatar,
        avatarUrl: avatar?.url || getImageUrl(seller.avatar),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getSellerOnboardingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.cookies.access_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.json({ status: "PENDING" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      userId: string;
      role: "user" | "seller";
    };

    if (!decoded) {
      return res.json({ status: "PENDING" });
    }

    const seller = await prisma.seller.findUnique({
      where: { id: decoded.userId },
    });

    if (!seller) {
      return res.json({ status: "PENDING" });
    }

    return res.json({ status: seller.status });
  } catch (error) {
    return next(error);
  }
};

export const getSeller = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = (req as any).role;
    const user = (req as any).user;

    if (role !== "seller") {
      throw new AuthError("Only sellers can access this resource");
    }

    const seller = await prisma.seller.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone_number: true,
        country: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            bio: true,
            category: true,
            avatar: true,
            coverBanner: true,
            address: true,
            opening_hours: true,
            website: true,
            ratings: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!seller) {
      throw new AuthError("Seller account not found");
    }

    const avatar = normalizeSellerAvatar(seller.avatar);
    const sellerResponse = {
      ...seller,
      avatar,
      avatarUrl: avatar?.url || getImageUrl(seller.avatar),
    };

    return res.status(201).json({
      success: true,
      user: sellerResponse,
      seller: sellerResponse,
      shop: sellerResponse.shop,
      role,
    });
  } catch (error) {
    return next(error);
  }
};
