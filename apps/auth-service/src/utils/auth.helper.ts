import crypto from "crypto";
import { ValidationError } from "@error-handler";
import redis from "@libs/redis";
import { sendEmail } from "./sendMail";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type TempRegistration = {
  name: string;
  password: string;
  phone_number?: string;
  country?: string;
};

export const validateRegistrationData = (
  data: any,
  userType: "user" | "seller",
) => {
  const { name, email, password, phone_number, country } = data;

  if (
    !name ||
    !email ||
    !password ||
    (userType === "seller" && (!phone_number || !country))
  ) {
    throw new ValidationError(`Missing required fields!`);
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
};

export const checkOtpRestrictions = async (email: string) => {
  if (await redis.get(`otp_lock:${email}`)) {
    throw new ValidationError(
      "Account is locked due to multiple failed attempts! Try again after 30 minutes",
    );
  }

  if (await redis.get(`otp_spam_lock:${email}`)) {
    throw new ValidationError(
      "Too many otp requests! Please wait 1 hour before requesting again",
    );
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    throw new ValidationError(
      "Please wait 1 minute before requesting a new otp!",
    );
  }
};

export const trackOtpRequests = async (email: string) => {
  const otpRequestKey = `otp_request_count:${email}`;
  let otpRequests = parseInt((await redis.get(otpRequestKey)) || "0");

  if (otpRequests >= 3) {
    await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600);
    cleanupRegistrationData(email);
    throw new ValidationError(
      "Too many otp requests! Please wait 1 hour before requesting again",
    );
  }

  redis.set(otpRequestKey, otpRequests + 1, "EX", 3600);
};

export const sendOtp = async (name: string, email: string, templet: string) => {
  const otp = crypto.randomInt(1000, 9999).toString();

  await sendEmail(email, "Verify your Email", templet, { name, otp });

  await redis.set(`otp:${email}`, otp, "EX", 300);
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60);
};

export const verifyOtp = async (email: string, otp: string) => {
  const savedOtp = await redis.get(`otp:${email}`);

  if (!savedOtp) {
    throw new ValidationError("OTP is invalid or expired");
  }

  const failedAttemptsKey = `otp_attampts:${email}`;
  let failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || "0");

  if (savedOtp !== otp) {
    if (failedAttempts >= 2) {
      await redis.set(`otp_lock:${email}`, "locked", "EX", 1800);
      cleanupRegistrationData(email);

      throw new ValidationError(
        "Too many failed attempts. Account locked for 30 minutes",
      );
    }

    await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", 300);

    throw new ValidationError(
      `OTP is invalid. ${2 - failedAttempts} attempts left`,
    );
  }
  await redis.del(`otp:${email}`, failedAttemptsKey);
};

export const storeTempRegistration = async (
  email: string,
  data: TempRegistration,
) => {
  await redis.set(
    `register:${email}`,
    JSON.stringify(data),
    "EX",
    300, // 5 minutes
  );
};

export const getTempRegistration = async (
  email: string,
): Promise<TempRegistration> => {
  const tempData = await redis.get(`register:${email}`);

  if (!tempData) {
    throw new ValidationError("Registration session expired");
  }

  return JSON.parse(tempData) as TempRegistration;
};

export const cleanupRegistrationData = async (email: string) => {
  await redis.del(
    `otp_request_count:${email}`,
    `otp_cooldown:${email}`,
    `register:${email}`,
    `otp:${email}`,
    `otp_attampts:${email}`,
  );
};

export const userForgotPasswordHandler = async (
  name: string,
  email: string,
) => {
  const resetToken = crypto.randomBytes(32).toString("hex");

  await redis.set(`reset_token:${resetToken}`, email, "EX", 300);

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendEmail(email, "Reset your password", "forgot-password-user-mail", {
    name,
    resetUrl,
  });
};
