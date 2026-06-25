import express, { Router } from "express";
import {
  userForgotPassword,
  loginUser,
  userOtpVerification,
  userRegistration,
  userResetPassword,
  verifyRegistrationToken,
  resendOtp,
  verifyResetPasswordToken,
  refreshToken,
} from "../controllers/auth.controller";
import {
  createShippingAddress,
  deleteShippingAddress,
  getMe,
  getShippingAddresses,
  logoutUser,
  setDefaultShippingAddress,
  updateMe,
  updateShippingAddress,
} from "../controllers/profile.controller";
import { verifyRegistrationTokenMiddleware } from "../middleware/auth.middleware";
import {
  connectStripe,
  createShop,
  getSeller,
  getSellerOnboardingStatus,
  loginSeller,
  resendSellerOtp,
  sellerOtpVerification,
  sellerRegistration,
} from "../controllers/authSeller.controller";
import { isAuthenticated } from "@middleware/auth.middleware";

const router: Router = express.Router();

router.post("/user-registration", userRegistration);
router.post(
  "/verify-otp",
  verifyRegistrationTokenMiddleware,
  userOtpVerification,
);
router.post(
  "/verify-registration-token",
  verifyRegistrationTokenMiddleware,
  verifyRegistrationToken,
);
router.post("/resend-otp", verifyRegistrationTokenMiddleware, resendOtp);
router.post("/login-user", loginUser);
router.post("/login-seller", loginSeller);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser);
router.get("/logged-in-user", isAuthenticated, getMe);
router.get("/me", isAuthenticated, getMe);
router.patch("/me", isAuthenticated, updateMe);
router.get("/me/addresses", isAuthenticated, getShippingAddresses);
router.post("/me/addresses", isAuthenticated, createShippingAddress);
router.patch("/me/addresses/:id", isAuthenticated, updateShippingAddress);
router.delete("/me/addresses/:id", isAuthenticated, deleteShippingAddress);
router.patch(
  "/me/addresses/:id/default",
  isAuthenticated,
  setDefaultShippingAddress,
);
router.post("/forgot-password", userForgotPassword);
router.post("/password-reset/:token", userResetPassword);

router.get("/password-reset/verify/:token", verifyResetPasswordToken);

router.post("/seller-registration", sellerRegistration);

router.post(
  "/seller-verify-otp",
  verifyRegistrationTokenMiddleware,
  sellerOtpVerification,
);

router.post(
  "/seller-resend-otp",
  verifyRegistrationTokenMiddleware,
  resendSellerOtp,
);

router.post("/seller/shop", isAuthenticated, createShop);
router.post("/seller/stripe/connect", isAuthenticated, connectStripe);
router.get("/seller/status", getSellerOnboardingStatus);
router.get("/logged-in-seller", isAuthenticated, getSeller);

export default router;
