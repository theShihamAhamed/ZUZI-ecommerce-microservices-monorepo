import { NextFunction, Request, Response } from "express";
import {
  checkOtpRestrictions,
  cleanupRegistrationData,
  getTempRegistration,
  sendOtp,
  storeTempRegistration,
  trackOtpRequests,
  userForgotPasswordHandler,
  validateRegistrationData,
  verifyOtp,
} from "../utils/auth.helper";
import prisma from "@libs/prisma";
import {
  AuthError,
  NotFoundError,
  ValidationError,
} from "@error-handler";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  generateRegistrationToken,
} from "../utils/token/token.util";
import { setAccessCookie, setAuthCookies } from "../utils/cookies/cookie.util";
import redis from "@libs/redis";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { getImageUrl, normalizeImageAsset } from "@libs/imageAssets";

const normalizeAuthAvatar = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return normalizeAuthAvatar(value[0]);
  }

  if (typeof value === "string") {
    const url = value.trim();
    return url ? { url, fileId: "external-image" } : null;
  }

  return normalizeImageAsset(value);
};

export const userRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateRegistrationData(req.body, "user");

    const { name, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ValidationError("User already exists with this email");
    }

    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(name, email, "user-activation-mail");
    const token = generateRegistrationToken(email);

    const hashedPassword = await bcrypt.hash(password, 10);

    await storeTempRegistration(email, {
      name,
      password: hashedPassword,
    });

    res.status(200).json({
      message: "OTP sent to email. please verify your account.",
      registrationToken: token,
    });
  } catch (error) {
    return next(error);
  }
};

export const userOtpVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { registrationToken, otp } = req.body;

    if (!registrationToken || !otp) {
      throw new ValidationError("Missing required fields");
    }

    const email = (req as any).emailFromToken;

    await verifyOtp(email, otp);

    const { name, password } = await getTempRegistration(email);

    await prisma.user.create({
      data: {
        email,
        name,
        password,
      },
    });

    await cleanupRegistrationData(email);

    res.status(201).json({
      message: "Registration completed successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new ValidationError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new ValidationError("Invalid email or password");
    }

    const payload = { userId: user.id, role: "user" } as const;

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookies(res, accessToken, refreshToken);

    const avatar = normalizeAuthAvatar(user.avatar);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar,
        avatarUrl: avatar?.url || getImageUrl(user.avatar),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;
    if (!REFRESH_TOKEN_SECRET) {
      throw new Error("JWT secrets are not defined");
    }
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      throw new ValidationError("Unauthorized! No refresh token.");
    }
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as {
      userId: string;
      role: "user" | "seller" | "admin";
    };

    if (!decoded || !decoded.userId || !decoded.role) {
      throw new JsonWebTokenError("Forbidden! Invalid refresh token.");
    }

    let entity;

    if (decoded.role === "user") {
      entity = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
    } else {
      entity = await prisma.seller.findUnique({
        where: { id: decoded.userId },
      });
    }

    if (!entity) {
      throw new AuthError("Forbidden! Account not found.");
    }

    const accessToken = generateAccessToken({
      userId: entity.id,
      role: decoded.role,
    });

    setAccessCookie(res, accessToken);

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

export const userForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(200).json({
        message: "If an account exists, a password reset email has been sent",
      });
    }
    await userForgotPasswordHandler(user.name, user.email);

    return res.status(200).json({
      message: "If an account exists, a password reset email has been sent",
    });
  } catch (error) {
    return next(error);
  }
};

export const userResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      throw new ValidationError("Password is required");
    }

    const email = await redis.get(`reset_token:${token}`);

    if (!email) {
      throw new NotFoundError("Invalid or expired password reset token");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await redis.del(`reset_token:${token}`);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const email = (req as any).emailFromToken;

    if (!email) {
      throw new ValidationError("Email not found for this registration token");
    }

    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(email, email, "user-activation-mail");

    res.status(200).json({
      message: "OTP resent successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const verifyRegistrationToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const email = (req as any).emailFromToken;

    if (!email) {
      return res.status(400).json({ valid: false, message: "Invalid token" });
    }

    return res.status(200).json({ valid: true, email });
  } catch (err) {
    return next(err);
  }
};

export const verifyResetPasswordToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new ValidationError("Reset token is required");
    }

    const email = await redis.get(`reset_token:${token}`);

    if (!email) {
      return res.status(404).json({
        valid: false,
        message: "Invalid or expired reset token",
      });
    }

    return res.status(200).json({
      valid: true,
    });
  } catch (error) {
    return next(error);
  }
};
