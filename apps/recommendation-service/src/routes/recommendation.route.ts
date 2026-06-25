import { Router } from "express";
import {
  getRecommendedProducts,
  trainMyRecommendations,
} from "../controllers/recommendation.controller";
import { optionalUserAuth } from "../utils/optional-auth";
import { requireRecommendationUser } from "../utils/recommendation-auth";

const router = Router();

router.get("/products", optionalUserAuth, getRecommendedProducts);
router.post("/train/me", requireRecommendationUser, trainMyRecommendations);

export default router;
