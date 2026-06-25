import prisma from "@libs/prisma";
import type { Prisma } from "@prisma/client";
import { ValidationError } from "@error-handler";
import {
  CreateNotificationInput,
  NotificationRecipientType,
} from "../types/notification.types";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const recipientTypes = new Set<NotificationRecipientType>([
  "user",
  "seller",
  "admin",
]);

export const isObjectId = (value?: string | null): value is string =>
  typeof value === "string" && OBJECT_ID_PATTERN.test(value);

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const isNotificationRecipientType = (
  value: unknown,
): value is NotificationRecipientType =>
  typeof value === "string" &&
  recipientTypes.has(value as NotificationRecipientType);

const assertCreateNotificationInput = (input: CreateNotificationInput) => {
  if (!isNotificationRecipientType(input.recipientType)) {
    throw new ValidationError("Invalid notification recipient type");
  }

  if (input.recipientType !== "admin" && !isObjectId(input.recipientId)) {
    throw new ValidationError("Valid recipientId is required");
  }

  if (input.recipientType === "admin" && input.recipientId && !isObjectId(input.recipientId)) {
    throw new ValidationError("Invalid admin recipientId");
  }

  if (!normalizeText(input.type)) {
    throw new ValidationError("Notification type is required");
  }

  if (!normalizeText(input.title)) {
    throw new ValidationError("Notification title is required");
  }

  if (!normalizeText(input.message)) {
    throw new ValidationError("Notification message is required");
  }
};

export const serializeNotification = (notification: any) => {
  const isRead = Boolean(notification.isRead || notification.read);

  return {
    id: notification.id,
    recipientId: notification.recipientId || notification.receiverId || null,
    recipientType:
      notification.recipientType || notification.receiverRole || null,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data || null,
    redirectUrl: notification.redirectUrl || notification.redirect_link || null,
    isRead,
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
};

export const createNotification = async (input: CreateNotificationInput) => {
  assertCreateNotificationInput(input);

  const dedupeKey = normalizeText(input.dedupeKey) || null;

  if (dedupeKey) {
    const existing = await prisma.notifications.findFirst({
      where: {
        dedupeKey,
      },
    });

    if (existing) {
      return serializeNotification(existing);
    }
  }

  const created = await prisma.notifications.create({
    data: {
      creatorId: isObjectId(input.creatorId) ? input.creatorId : null,
      recipientId: input.recipientId || null,
      recipientType: input.recipientType,
      receiverId: input.recipientId || null,
      receiverRole: input.recipientType,
      type: normalizeText(input.type),
      title: normalizeText(input.title),
      message: normalizeText(input.message),
      redirectUrl: normalizeText(input.redirectUrl) || null,
      redirect_link: normalizeText(input.redirectUrl) || null,
      data: input.data as Prisma.InputJsonValue | undefined,
      dedupeKey,
      isRead: false,
      read: false,
    },
  });

  return serializeNotification(created);
};
