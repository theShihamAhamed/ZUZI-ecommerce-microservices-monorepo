import jwt from "jsonwebtoken";
type TokenPayload = {
  userId: string;
  role: "user" | "seller" | "admin";
};

export const generateRegistrationToken = (email: string) => {
  const REGISTRATION_SECRET = process.env.REGISTRATION_SECRET;

  if (!REGISTRATION_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ email, type: "registration" }, REGISTRATION_SECRET!, {
    expiresIn: "5m",
  });
};

export const generateAccessToken = (payload: TokenPayload) => {
  const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string;

  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("JWT secrets are not defined");
  }
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (payload: TokenPayload) => {
  const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string;

  if (!REFRESH_TOKEN_SECRET) {
    throw new Error("JWT secrets are not defined");
  }

  return jwt.sign(payload, REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};
