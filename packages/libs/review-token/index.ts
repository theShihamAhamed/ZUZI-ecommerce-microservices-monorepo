import crypto from "crypto";

const DEFAULT_REVIEW_REQUEST_EXPIRY_DAYS = 30;
const PUBLIC_ID_BYTES = 18;
const SECRET_BYTES = 32;

const toUrlSafeRandomString = (byteLength: number) =>
  crypto.randomBytes(byteLength).toString("base64url");

export const hashReviewRequestToken = (token: string): string =>
  crypto.createHash("sha256").update(token.trim(), "utf8").digest("hex");

export const generateReviewRequestToken = (): {
  publicId: string;
  secret: string;
  token: string;
  tokenHash: string;
} => {
  const publicId = toUrlSafeRandomString(PUBLIC_ID_BYTES);
  const secret = toUrlSafeRandomString(SECRET_BYTES);
  const token = `${publicId}.${secret}`;

  return {
    publicId,
    secret,
    token,
    tokenHash: hashReviewRequestToken(token),
  };
};

export const parseReviewRequestCode = (
  code: string,
): {
  publicId: string;
  token?: string;
  hasSecret: boolean;
} => {
  const trimmed = code.trim();
  const separatorIndex = trimmed.indexOf(".");

  if (separatorIndex === -1) {
    return {
      publicId: trimmed,
      hasSecret: false,
    };
  }

  const publicId = trimmed.slice(0, separatorIndex);
  const secret = trimmed.slice(separatorIndex + 1);
  const hasSecret = Boolean(publicId && secret && !secret.includes("."));

  return {
    publicId,
    token: hasSecret ? `${publicId}.${secret}` : undefined,
    hasSecret,
  };
};

export const getReviewRequestExpiryDate = (
  days = DEFAULT_REVIEW_REQUEST_EXPIRY_DAYS,
): Date => {
  const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_REVIEW_REQUEST_EXPIRY_DAYS;
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + safeDays);

  return expiresAt;
};
