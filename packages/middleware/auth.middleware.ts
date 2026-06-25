import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../libs/prisma";
import { AuthError, ValidationError } from "../error-handler";

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.cookies.access_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized! Token missing." });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      userId: string;
      role: "user" | "seller";
    };

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized! Invalid token." });
    }

    const entity =
      decoded.role === "seller"
        ? await prisma.seller.findUnique({ where: { id: decoded.userId } })
        : await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!entity) {
      throw new AuthError("Forbidden! Account not found.");
    }

    (req as any).user = entity;
    (req as any).role = decoded.role;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ValidationError("Access token expired"));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ValidationError("Invalid Access token"));
    }
    next(error);
  }
};
