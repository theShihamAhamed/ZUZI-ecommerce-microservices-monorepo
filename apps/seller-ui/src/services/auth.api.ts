import axiosInstance from "@/lib/axios";
import { SellerFormData } from "@/app/(auth)/sign-up/page";

export const registerSellerApi = async (data: SellerFormData) => {
  const res = await axiosInstance.post("/api/seller-registration", {
    name: data.fullName,
    email: data.email,
    password: data.password,
    phone_number: data.phone,
    country: data.country,
  });
  return res.data;
};

export const verifySellerOtpApi = async (
  registrationToken: string,
  otp: string,
) => {
  const res = await axiosInstance.post("/api/seller-verify-otp", {
    otp,
    registrationToken,
  });
  return res.data; // { success, sellerId, message }
};

export const resendSellerOtpApi = async (registrationToken: string) => {
  const res = await axiosInstance.post("/api/seller-resend-otp", {
    registrationToken,
  });
  return res.data; // { message }
};

export const loginSellerApi = async (data: {
  email: string;
  password: string;
}) => {
  const res = await axiosInstance.post("/api/login-seller", data);
  return res.data;
};

export const fetchSellerAPI = async () => {
  const res = await axiosInstance.get("/api/logged-in-seller");
  return res.data;
};

export const logoutSellerApi = async () => {
  const res = await axiosInstance.post("/api/logout");
  return res.data;
};

export const createShopApi = async (data: any) => {
  const res = await axiosInstance.post("/api/seller/shop", {
    name: data.shopName,
    bio: data.shopBio,
    address: data.businessAddress,
    opening_hours: data.openingHours,
    website: data.websiteUrl,
    category: data.shopCategory,
  });

  return res.data;
};

export const connectStripeApi = async () => {
  const res = await axiosInstance.post("/api/seller/stripe/connect");
  return res.data;
};

export const getSellerStatusApi = async () => {
  const res = await axiosInstance.get("/api/seller/status");
  return res.data;
};
