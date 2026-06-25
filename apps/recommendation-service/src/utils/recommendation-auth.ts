import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "@libs/prisma";
import { getRequestToken } from "./optional-auth";

type AccessTokenPayload = {
  userId?: string;
  role?: "user" | "seller" | "admin";
};

export type RecommendationUser = {
  id: string;
  name: string;
  email: string;
};

export const requireRecommendationUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = getRequestToken(req);
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!token || !secret) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;

    if (decoded.role !== "user" || !decoded.userId) {
      return res.status(403).json({
        success: false,
        message: "Only customer accounts can train recommendations",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Customer account not found",
      });
    }

    (req as any).recommendationUser = user satisfies RecommendationUser;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};
