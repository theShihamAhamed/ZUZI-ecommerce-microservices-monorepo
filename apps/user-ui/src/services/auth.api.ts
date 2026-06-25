import { SignupFormData } from "@/constants/auth.schema";
import axiosInstance from "@/libs/axios";

// REGISTER
export const registerUserApi = async (data: SignupFormData) => {
  const res = await axiosInstance.post("/user-registration", {
    name: data.fullName,
    email: data.email,
    password: data.password,
  });
  return res.data;
};

// VERIFY OTP
export const verifyOtpApi = async ({
  registrationToken,
  otp,
}: {
  registrationToken: string;
  otp: string;
}) => {
  const res = await axiosInstance.post("/verify-otp", {
    registrationToken,
    otp,
  });
  return res.data;
};

// LOGIN
export const loginUserApi = async (data: {
  email: string;
  password: string;
}) => {
  const res = await axiosInstance.post("/login-user", data);
  return res.data;
};

// FETCH USER DATA
export const fetchUserAPI = async () => {
  const res = await axiosInstance.get("/me");
  return res.data.user;
};

// RESEND OTP
export const resendOtpApi = async ({
  registrationToken,
}: {
  registrationToken: string;
}) => {
  const res = await axiosInstance.post("/resend-otp", {
    registrationToken,
  });
  return res.data;
};

// VERIFY REGISTRATION TOKEN
export const verifyRegistrationTokenApi = async (registrationToken: string) => {
  const res = await axiosInstance.post("/verify-registration-token", {
    registrationToken,
  });
  return res.data;
};

// FORGOT PASSWORD
export const forgotPasswordApi = async (email: string) => {
  const res = await axiosInstance.post("/forgot-password", { email });
  return res.data;
};

// RESET PASSWORD
export const resetPasswordApi = async ({
  token,
  password,
}: {
  token: string;
  password: string;
}) => {
  const res = await axiosInstance.post(`/password-reset/${token}`, {
    password,
  });
  return res.data;
};

// VERIFY RESET TOKEN
export const verifyResetTokenApi = async (token: string) => {
  const res = await axiosInstance.get(`/password-reset/verify/${token}`);
  return res.data;
};
