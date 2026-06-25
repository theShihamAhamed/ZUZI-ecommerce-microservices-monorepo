import express, { Router } from "express";
import { isAuthenticated } from "@middleware/auth.middleware";
import {
  addCartItem,
  clearCart,
  createPaymentSession,
  getCart,
  getCartSummary,
  getMyOrderDetail,
  getMyOrders,
  getSellerPayments,
  getSellerPaymentsSummary,
  removeCartItem,
  getSellerOrderDetail,
  getSellerOrders,
  syncCart,
  verifyingPaymentSession,
  updateCartItemQuantity,
  updateSellerOrderStatus,
} from "../controllers/order.controller";

const router: Router = express.Router();

router.get("/cart", isAuthenticated, getCart);
router.post("/cart/summary", isAuthenticated, getCartSummary);
router.post("/cart/items", isAuthenticated, addCartItem);
router.patch("/cart/items", isAuthenticated, updateCartItemQuantity);
router.delete("/cart/items", isAuthenticated, removeCartItem);
router.delete("/cart", isAuthenticated, clearCart);
router.post("/cart/sync", isAuthenticated, syncCart);
router.post("/create-payment-session", isAuthenticated, createPaymentSession);
router.get(
  "/verifying-payment-session",
  isAuthenticated,
  verifyingPaymentSession,
);
router.get("/my-orders", isAuthenticated, getMyOrders);
router.get("/my-orders/:id", isAuthenticated, getMyOrderDetail);
router.get("/seller/payments/summary", isAuthenticated, getSellerPaymentsSummary);
router.get("/seller/payments", isAuthenticated, getSellerPayments);
router.get("/seller/orders", isAuthenticated, getSellerOrders);
router.get("/seller/orders/:id", isAuthenticated, getSellerOrderDetail);
router.patch(
  "/seller/orders/:id/status",
  isAuthenticated,
  updateSellerOrderStatus,
);

export default router;
