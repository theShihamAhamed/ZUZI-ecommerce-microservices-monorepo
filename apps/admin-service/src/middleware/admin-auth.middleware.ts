import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "@libs/prisma";
import { AuthError } from "@error-handler";
import {
  ADMIN_ACCESS_COOKIE,
  getSafeAdmin,
  verifyAdminAccessToken,
} from "../utils/admin-auth";

export const isAdminAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.cookies?.[ADMIN_ACCESS_COOKIE] ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new AuthError("Admin authentication required");
    }

    const decoded = verifyAdminAccessToken(token);

    if (decoded.role !== "admin") {
      throw new AuthError("Invalid admin session");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin || admin.status !== "ACTIVE") {
      throw new AuthError("Admin account is not active");
    }

    (req as any).admin = getSafeAdmin(admin);
    (req as any).role = "admin";
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthError("Admin access token expired"));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthError("Invalid admin access token"));
    }

    return next(error);
  }
};
