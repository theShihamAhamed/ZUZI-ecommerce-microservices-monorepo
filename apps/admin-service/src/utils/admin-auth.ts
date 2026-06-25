import { Response } from "express";
import jwt from "jsonwebtoken";

export const ADMIN_ACCESS_COOKIE = "admin_access_token";
export const ADMIN_REFRESH_COOKIE = "admin_refresh_token";

export type AdminJwtPayload = {
  adminId: string;
  role: "admin";
  adminRole: "SUPER_ADMIN" | "ADMIN";
};

type SafeAdmin = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: Date | null;
  createdAt: Date;
};

const getAccessSecret = () => {
  const secret =
    process.env.ADMIN_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error("Admin access token secret is not configured");
  }

  return secret;
};

const getRefreshSecret = () => {
  const secret =
    process.env.ADMIN_REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;

  if (!secret) {
    throw new Error("Admin refresh token secret is not configured");
  }

  return secret;
};

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  };
};

export const getSafeAdmin = (admin: SafeAdmin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  status: admin.status,
  lastLoginAt: admin.lastLoginAt,
  createdAt: admin.createdAt,
});

export const generateAdminAccessToken = (payload: AdminJwtPayload) =>
  jwt.sign(payload, getAccessSecret(), {
    expiresIn: "15m",
  });

export const generateAdminRefreshToken = (payload: AdminJwtPayload) =>
  jwt.sign(payload, getRefreshSecret(), {
    expiresIn: "7d",
  });

export const verifyAdminAccessToken = (token: string) =>
  jwt.verify(token, getAccessSecret()) as AdminJwtPayload;

export const verifyAdminRefreshToken = (token: string) =>
  jwt.verify(token, getRefreshSecret()) as AdminJwtPayload;

export const setAdminAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  const cookieOptions = getCookieOptions();

  res.cookie(ADMIN_ACCESS_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const setAdminAccessCookie = (res: Response, accessToken: string) => {
  res.cookie(ADMIN_ACCESS_COOKIE, accessToken, {
    ...getCookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
};

export const clearAdminAuthCookies = (res: Response) => {
  const cookieOptions = getCookieOptions();

  res.clearCookie(ADMIN_ACCESS_COOKIE, cookieOptions);
  res.clearCookie(ADMIN_REFRESH_COOKIE, cookieOptions);
};
