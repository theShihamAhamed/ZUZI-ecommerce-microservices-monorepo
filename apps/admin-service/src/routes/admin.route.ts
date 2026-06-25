import express, { Router } from "express";
import {
  getAdminServiceHealth,
  getAdminServiceRoot,
} from "../controllers/admin.controller";
import {
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  setupInitialAdmin,
} from "../controllers/auth.controller";
import { getDashboardSummary } from "../controllers/dashboard.controller";
import { getAdminEvents } from "../controllers/events.controller";
import {
  getAdminOrderDetail,
  getAdminOrders,
} from "../controllers/orders.controller";
import {
  getAdminPayments,
  getAdminPaymentsSummary,
} from "../controllers/payments.controller";
import {
  getAdminProductDetail,
  getAdminProducts,
} from "../controllers/products.controller";
import {
  deleteAdminReview,
  getAdminReviewDetail,
  getAdminReviews,
  updateAdminReviewStatus,
} from "../controllers/reviews.controller";
import {
  getAdminSellerDetail,
  getAdminSellers,
} from "../controllers/sellers.controller";
import {
  getAdminUserDetail,
  getAdminUsers,
} from "../controllers/users.controller";
import { isAdminAuthenticated } from "../middleware/admin-auth.middleware";

const router: Router = express.Router();

router.get("/", getAdminServiceRoot);
router.get("/health", getAdminServiceHealth);
router.post("/auth/setup", setupInitialAdmin);
router.post("/auth/login", loginAdmin);
router.post("/auth/refresh", refreshAdminSession);
router.post("/auth/logout", logoutAdmin);

router.use(isAdminAuthenticated);

router.get("/auth/me", getCurrentAdmin);
router.get("/dashboard/summary", getDashboardSummary);
router.get("/orders", getAdminOrders);
router.get("/orders/:id", getAdminOrderDetail);
router.get("/payments", getAdminPayments);
router.get("/payments/summary", getAdminPaymentsSummary);
router.get("/products", getAdminProducts);
router.get("/products/:id", getAdminProductDetail);
router.get("/reviews", getAdminReviews);
router.get("/reviews/:reviewId", getAdminReviewDetail);
router.patch("/reviews/:reviewId/status", updateAdminReviewStatus);
router.delete("/reviews/:reviewId", deleteAdminReview);
router.get("/events", getAdminEvents);
router.get("/users", getAdminUsers);
router.get("/users/:id", getAdminUserDetail);
router.get("/sellers", getAdminSellers);
router.get("/sellers/:id", getAdminSellerDetail);

export default router;
