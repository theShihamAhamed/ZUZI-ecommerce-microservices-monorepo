import { Request, Response, NextFunction } from "express";
import { ValidationError } from "@error-handler";
import redis from "@libs/redis";
import jwt from "jsonwebtoken";

export const verifyRegistrationTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { registrationToken } = req.body;

  if (!registrationToken) {
    return next(new ValidationError("Registration token is required"));
  }

  try {
    const payload = jwt.verify(
      registrationToken,
      process.env.REGISTRATION_SECRET!,
    ) as { email: string; type: string };

    if (payload.type !== "registration") {
      return next(new ValidationError("Invalid registration token"));
    }

    const otpSession = await redis.get(`otp:${payload.email}`);

    if (!otpSession) {
      return next(new ValidationError("OTP session expired"));
    }

    (req as any).emailFromToken = payload.email;

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new ValidationError("Registration token expired"));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new ValidationError("Invalid registration token"));
    }
    next(err);
  }
};
