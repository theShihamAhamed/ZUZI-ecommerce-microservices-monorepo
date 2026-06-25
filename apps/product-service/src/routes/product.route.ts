import express, { Router } from "express";
import {
  createProduct,
  createSellerEvent,
  deleteProductImage,
  deleteSellerEvent,
  getEventProducts,
  getFilteredProducts,
  getCategories,
  getAllProducts,
  getProductDetail,
  getProductReviews,
  getProductReviewSummaryController,
  getReviewEligibility,
  getReviewRequest,
  createReview,
  submitReviewRequest,
  updateMyReview,
  deleteMyReview,
  getMyReviews,
  getSellerReviews,
  replyToSellerReview,
  reportSellerReview,
  getSellerProduct,
  getSellerEvent,
  getSellerEvents,
  getSellerShopSettings,
  getShopDetail,
  getShopReviews,
  getShopReviewSummaryController,
  getShops,
  getPublicShopEvents,
  getPublicShopProducts,
  getSellerShopAnalytics,
  getTopShops,
  searchProducts,
  uploadProductImage,
  getShopProducts,
  updateSellerProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  restoreSellerEvent,
  updateSellerEvent,
  updateSellerShopSettings,
} from "../controllers/product.controller";
import { isAuthenticated } from "@middleware/auth.middleware";
import {
  createDiscountCode,
  deleteDiscountCode,
  getDiscountCodes,
} from "../controllers/discountcodes.controller";
import { uploadProductImageMiddleware } from "../middleware/uploadProductImageMiddleware";

const router: Router = express.Router();

router.get("/get-categories", getCategories);
router.get("/get-products", getAllProducts);
router.get("/get-filtered-products", getFilteredProducts);
router.get("/search-products", searchProducts);
router.get("/events", getEventProducts);
router.get("/products/:productId/review-summary", getProductReviewSummaryController);
router.get("/products/:productId/reviews", getProductReviews);
router.get("/reviews/eligibility", isAuthenticated, getReviewEligibility);
router.get("/reviews/requests/:code", isAuthenticated, getReviewRequest);
router.post("/reviews/requests/:code/submit", isAuthenticated, submitReviewRequest);
router.post("/reviews", isAuthenticated, createReview);
router.patch("/reviews/:reviewId", isAuthenticated, updateMyReview);
router.delete("/reviews/:reviewId", isAuthenticated, deleteMyReview);
router.get("/my-reviews", isAuthenticated, getMyReviews);
router.get("/shops", getShops);
router.get("/shops/:shopId/review-summary", getShopReviewSummaryController);
router.get("/shops/:shopId/reviews", getShopReviews);
router.get("/shops/:shopId/products", getPublicShopProducts);
router.get("/shops/:shopId/events", getPublicShopEvents);
router.get("/shops/:shopId", getShopDetail);
router.get("/top-shops", getTopShops);
router.get("/get-product/:slug", getProductDetail);
router.get("/seller/shop/analytics", isAuthenticated, getSellerShopAnalytics);
router.get("/seller/shop", isAuthenticated, getSellerShopSettings);
router.patch("/seller/shop", isAuthenticated, updateSellerShopSettings);
router.get("/seller/reviews", isAuthenticated, getSellerReviews);
router.patch(
  "/seller/reviews/:reviewId/reply",
  isAuthenticated,
  replyToSellerReview,
);
router.post(
  "/seller/reviews/:reviewId/report",
  isAuthenticated,
  reportSellerReview,
);
router.get("/seller/events", isAuthenticated, getSellerEvents);
router.post("/seller/events", isAuthenticated, createSellerEvent);
router.get("/seller/events/:eventId", isAuthenticated, getSellerEvent);
router.patch("/seller/events/:eventId", isAuthenticated, updateSellerEvent);
router.delete("/seller/events/:eventId", isAuthenticated, deleteSellerEvent);
router.patch(
  "/seller/events/:eventId/restore",
  isAuthenticated,
  restoreSellerEvent,
);
router.get("/get-shop-products", isAuthenticated, getShopProducts);
router.get("/seller/products/:id", isAuthenticated, getSellerProduct);
router.patch("/seller/products/:id", isAuthenticated, updateSellerProduct);
router.post("/create-discount-code", isAuthenticated, createDiscountCode);
router.get("/get-discount-codes", isAuthenticated, getDiscountCodes);
router.delete("/delete-discount-code", isAuthenticated, deleteDiscountCode);
router.post(
  "/upload-image",
  isAuthenticated,
  uploadProductImageMiddleware,
  uploadProductImage,
);
router.post("/delete-image", isAuthenticated, deleteProductImage);
router.post("/create-product", isAuthenticated, createProduct);
router.put("/update-product", isAuthenticated, updateProduct);
router.post("/delete-product", isAuthenticated, deleteProduct);
router.patch("/restore-product", isAuthenticated, restoreProduct);

export default router;
