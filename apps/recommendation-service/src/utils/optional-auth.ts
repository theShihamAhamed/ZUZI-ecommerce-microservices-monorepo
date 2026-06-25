import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "@libs/prisma";

type AccessTokenPayload = {
  userId?: string;
  role?: "user" | "seller" | "admin";
};

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
};

export const getRequestToken = (req: Request) =>
  req.cookies?.access_token || getBearerToken(req.headers.authorization);

export const optionalUserAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = getRequestToken(req);
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!token || !secret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, secret) as AccessTokenPayload;

    if (decoded.role !== "user" || !decoded.userId) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (user) {
      (req as any).recommendationUser = user;
    }
  } catch {
    // Recommendation reads are public; invalid auth simply behaves as guest.
  }

  return next();
};
