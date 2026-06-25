"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  registerUserApi,
  verifyOtpApi,
  loginUserApi,
  resendOtpApi,
  verifyRegistrationTokenApi,
  forgotPasswordApi,
  resetPasswordApi,
  verifyResetTokenApi,
  fetchUserAPI,
} from "@/services/auth.api";

export const useAuth = () => {
  // REGISTER
  const registerUser = useMutation({
    mutationFn: registerUserApi,
  });

  // VERIFY OTP
  const verifyOtp = useMutation({
    mutationFn: verifyOtpApi,
  });

  // LOGIN
  const login = useMutation({
    mutationFn: loginUserApi,
  });

  // FETCH USER DATA
  const fetchUser = useQuery({
    queryKey: ["user"],
    queryFn: fetchUserAPI,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // RESEND OTP
  const resendOtp = useMutation({
    mutationFn: resendOtpApi,
  });

  // VERIFY REGISTRATION TOKEN
  const verifyToken = useMutation({
    mutationFn: verifyRegistrationTokenApi,
    retry: 1,
  });

  // FORGOT PASSWORD
  const forgotPassword = useMutation({
    mutationFn: forgotPasswordApi,
  });

  // RESET PASSWORD
  const resetPassword = useMutation({
    mutationFn: resetPasswordApi,
  });

  // VERIFY RESET TOKEN
  const verifyResetToken = useMutation({
    mutationFn: verifyResetTokenApi,
    retry: false,
  });

  return {
    registerUser,
    verifyOtp,
    login,
    fetchUser,
    resendOtp,
    verifyToken,
    forgotPassword,
    resetPassword,
    verifyResetToken,
  };
};
