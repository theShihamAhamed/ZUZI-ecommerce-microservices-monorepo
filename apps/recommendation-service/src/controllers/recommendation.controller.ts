import { NextFunction, Request, Response } from "express";
import {
  getRecommendationsForUser,
  getRecommendationPagination,
} from "../services/recommendation.service";
import { trainRecommendationsForUser } from "../services/recommendation-training.service";
import { RecommendationUser } from "../utils/recommendation-auth";

export const getRecommendedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pagination = getRecommendationPagination(req.query);
    const user = (req as any).recommendationUser as RecommendationUser | undefined;
    const recommendations = await getRecommendationsForUser({ user, pagination });

    return res.status(200).json(recommendations);
  } catch (error) {
    return next(error);
  }
};

export const trainMyRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).recommendationUser as RecommendationUser | undefined;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await trainRecommendationsForUser(user.id);
    const statusCode = result.success
      ? 200
      : "trainingStatus" in result && result.trainingStatus === "running"
        ? 409
        : 400;

    return res.status(statusCode).json(result);
  } catch (error) {
    return next(error);
  }
};
