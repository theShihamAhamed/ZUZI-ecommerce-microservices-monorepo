import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "@libs/prisma";
import { AuthError, ValidationError } from "@error-handler";
import {
  ADMIN_REFRESH_COOKIE,
  clearAdminAuthCookies,
  generateAdminAccessToken,
  generateAdminRefreshToken,
  getSafeAdmin,
  setAdminAccessCookie,
  setAdminAuthCookies,
  verifyAdminRefreshToken,
} from "../utils/admin-auth";

const getCredentials = (body: unknown) => {
  const payload = body as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password =
    typeof payload.password === "string" ? payload.password.trim() : "";

  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  return {
    email: email.toLowerCase(),
    password,
  };
};

const getSetupToken = (req: Request) => {
  const headerToken = req.headers["x-admin-setup-token"];
  const bodyToken = (req.body as Record<string, unknown>)?.setupToken;

  return typeof headerToken === "string"
    ? headerToken
    : typeof bodyToken === "string"
      ? bodyToken
      : "";
};

const createAdminTokens = (admin: {
  id: string;
  role: "SUPER_ADMIN" | "ADMIN";
}) => {
  const payload = {
    adminId: admin.id,
    role: "admin" as const,
    adminRole: admin.role,
  };

  return {
    accessToken: generateAdminAccessToken(payload),
    refreshToken: generateAdminRefreshToken(payload),
  };
};

export const setupInitialAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const configuredToken = process.env.ADMIN_SETUP_TOKEN;

    if (!configuredToken) {
      throw new ValidationError("Admin setup is not enabled");
    }

    if (getSetupToken(req) !== configuredToken) {
      throw new AuthError("Invalid admin setup token");
    }

    const existingAdmins = await prisma.admin.count();

    if (existingAdmins > 0) {
      throw new ValidationError("Initial admin has already been created");
    }

    const { email, password } = getCredentials(req.body);
    const payload = req.body as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim() : "";

    if (!name) {
      throw new ValidationError("Admin name is required");
    }

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    const tokens = createAdminTokens(admin);

    setAdminAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(201).json({
      success: true,
      admin: getSafeAdmin(admin),
    });
  } catch (error) {
    return next(error);
  }
};

export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = getCredentials(req.body);
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin || admin.status !== "ACTIVE") {
      throw new AuthError("Invalid admin credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new AuthError("Invalid admin credentials");
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = createAdminTokens(updatedAdmin);

    setAdminAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(200).json({
      success: true,
      admin: getSafeAdmin(updatedAdmin),
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshAdminSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies?.[ADMIN_REFRESH_COOKIE];

    if (!refreshToken) {
      throw new AuthError("Admin refresh token missing");
    }

    const decoded = verifyAdminRefreshToken(refreshToken);
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin || admin.status !== "ACTIVE") {
      throw new AuthError("Admin account is not active");
    }

    const { accessToken } = createAdminTokens(admin);

    setAdminAccessCookie(res, accessToken);

    return res.status(200).json({
      success: true,
      admin: getSafeAdmin(admin),
    });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    return res.status(200).json({
      success: true,
      admin: (req as any).admin,
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutAdmin = (_req: Request, res: Response) => {
  clearAdminAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Admin logged out",
  });
};
