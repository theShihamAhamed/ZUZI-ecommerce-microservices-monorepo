import { Request } from "express";
import {
  AuthError,
  ForbiddenError,
  ValidationError,
} from "@error-handler";

export type ChatParticipantRole = "user" | "seller";

export interface AuthenticatedChatParticipant {
  id: string;
  role: ChatParticipantRole;
}

export const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value : undefined;
};

export const getPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(getQueryString(value));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const getPagination = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    totalCount: total,
    totalItems: total,
    currentPage: page,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

export const getAuthenticatedParticipant = (
  req: Request,
): AuthenticatedChatParticipant => {
  const role = (req as any).role as ChatParticipantRole | undefined;
  const user = (req as any).user as { id?: string } | undefined;

  if (role !== "user" && role !== "seller") {
    throw new ForbiddenError("User or seller account required");
  }

  if (!user?.id) {
    throw new AuthError("Unauthorized");
  }

  return {
    id: user.id,
    role,
  };
};

export const requireCustomerParticipant = (
  participant: AuthenticatedChatParticipant,
) => {
  if (participant.role !== "user") {
    throw new ForbiddenError("Customer account required");
  }
};

export const getParticipantConversationWhere = (
  participant: AuthenticatedChatParticipant,
) => {
  return participant.role === "user"
    ? { userId: participant.id }
    : { sellerId: participant.id };
};

export const validateObjectIdParam = (value: string | undefined, label: string) => {
  if (!value || !isObjectIdLike(value)) {
    throw new ValidationError(`Invalid ${label}`);
  }

  return value;
};

export const buildConversationKey = ({
  userId,
  sellerId,
  shopId,
  productId,
}: {
  userId: string;
  sellerId: string;
  shopId?: string | null;
  productId?: string | null;
}) => `${userId}:${sellerId}:${shopId || "none"}:${productId || "none"}`;

export const getViewerUnreadCount = (
  conversation: {
    userUnreadCount: number;
    sellerUnreadCount: number;
  },
  participant: AuthenticatedChatParticipant,
) =>
  participant.role === "user"
    ? conversation.userUnreadCount
    : conversation.sellerUnreadCount;
