import { Request, Response } from "express";

export const getAdminServiceRoot = (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Admin service is ready",
    service: "admin-service",
  });
};

export const getAdminServiceHealth = (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    service: "admin-service",
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};
