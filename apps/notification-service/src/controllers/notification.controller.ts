import { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { ValidationError } from "@error-handler";
import {
  createNotification,
  isNotificationRecipientType,
  isObjectId,
  serializeNotification,
} from "../services/notification.service";
import { CreateNotificationInput } from "../types/notification.types";
import prisma from "@libs/prisma";

const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
};

const getPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(getQueryString(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getPagination = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const getAuthenticatedRecipient = (req: Request) => {
  const role = (req as any).role;
  const userId = (req as any).user?.id;

  if (!isNotificationRecipientType(role) || role === "admin") {
    throw new ValidationError("Unsupported notification recipient");
  }

  if (!isObjectId(userId)) {
    throw new ValidationError("Authenticated recipient is required");
  }

  return {
    recipientType: role,
    recipientId: userId,
  };
};

const getRecipientWhere = (
  recipientId: string,
  recipientType: string,
): Prisma.notificationsWhereInput => ({
  OR: [
    {
      recipientId,
      recipientType,
    },
    {
      receiverId: recipientId,
      receiverRole: recipientType,
    },
  ],
});

const withReadFilter = (
  where: Prisma.notificationsWhereInput,
  status?: string,
): Prisma.notificationsWhereInput => {
  if (status === "read") {
    return {
      AND: [
        where,
        {
          OR: [{ isRead: true }, { read: true }],
        },
      ],
    };
  }

  if (status === "unread") {
    return {
      AND: [
        where,
        {
          NOT: {
            OR: [{ isRead: true }, { read: true }],
          },
        },
      ],
    };
  }

  return where;
};

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { recipientId, recipientType } = getAuthenticatedRecipient(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, 20), 50);
    const status = getQueryString(req.query.status) || "all";
    const type = getQueryString(req.query.type);
    const skip = (page - 1) * limit;
    let where = withReadFilter(
      getRecipientWhere(recipientId, recipientType),
      status,
    );

    if (type) {
      where = {
        AND: [
          where,
          {
            type,
          },
        ],
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.notifications.count({
        where,
      }),
    ]);

    return res.status(200).json({
      success: true,
      notifications: notifications.map(serializeNotification),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { recipientId, recipientType } = getAuthenticatedRecipient(req);
    const unreadCount = await prisma.notifications.count({
      where: withReadFilter(
        getRecipientWhere(recipientId, recipientType),
        "unread",
      ),
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

export const markNotificationRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { recipientId, recipientType } = getAuthenticatedRecipient(req);
    const { id } = req.params;

    if (!isObjectId(id)) {
      throw new ValidationError("Invalid notification id");
    }

    const notification = await prisma.notifications.findFirst({
      where: {
        AND: [
          {
            id,
          },
          getRecipientWhere(recipientId, recipientType),
        ],
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const updated = await prisma.notifications.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
        read: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      notification: serializeNotification(updated),
    });
  } catch (error) {
    return next(error);
  }
};

export const markAllNotificationsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { recipientId, recipientType } = getAuthenticatedRecipient(req);
    const result = await prisma.notifications.updateMany({
      where: withReadFilter(
        getRecipientWhere(recipientId, recipientType),
        "unread",
      ),
      data: {
        isRead: true,
        read: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { recipientId, recipientType } = getAuthenticatedRecipient(req);
    const { id } = req.params;

    if (!isObjectId(id)) {
      throw new ValidationError("Invalid notification id");
    }

    const notification = await prisma.notifications.findFirst({
      where: {
        AND: [
          {
            id,
          },
          getRecipientWhere(recipientId, recipientType),
        ],
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await prisma.notifications.delete({
      where: {
        id: notification.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    return next(error);
  }
};

export const createInternalNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const expectedToken = process.env.NOTIFICATION_INTERNAL_TOKEN;
    const token = req.headers["x-notification-internal-token"];

    if (!expectedToken) {
      return res.status(503).json({
        success: false,
        message: "Notification internal API is not configured",
      });
    }

    if (token !== expectedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid notification internal token",
      });
    }

    const notification = await createNotification(
      req.body as CreateNotificationInput,
    );

    return res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    return next(error);
  }
};
