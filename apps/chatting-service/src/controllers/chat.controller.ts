import { NextFunction, Request, Response } from "express";
import prisma from "@libs/prisma";
import { NotFoundError, ValidationError } from "@error-handler";
import {
  buildConversationKey,
  getAuthenticatedParticipant,
  getPagination,
  getParticipantConversationWhere,
  getPositiveNumber,
  requireCustomerParticipant,
  validateObjectIdParam,
} from "../utils/chat.helpers";
import {
  serializeConversationPayload,
  serializeConversationPayloads,
  serializeMessage,
} from "../utils/chat.serializers";
import { markConversationSeenForParticipant } from "../utils/chat-persistence.helpers";

const CONVERSATION_LIMIT = 20;
const MESSAGE_LIMIT = 30;

const getParticipantConversation = async (req: Request) => {
  const participant = getAuthenticatedParticipant(req);
  const conversationId = validateObjectIdParam(
    req.params.conversationId,
    "conversation ID",
  );
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      ...getParticipantConversationWhere(participant),
    },
  });

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  return {
    participant,
    conversation,
  };
};

export const createOrGetConversation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const participant = getAuthenticatedParticipant(req);
    requireCustomerParticipant(participant);

    const productId = validateObjectIdParam(req.body?.productId, "product ID");
    const requestedShopId =
      typeof req.body?.shopId === "string" && req.body.shopId.trim()
        ? validateObjectIdParam(req.body.shopId.trim(), "shop ID")
        : undefined;
    const product = await prisma.products.findFirst({
      where: {
        id: productId,
        isDeleted: false,
        status: "Active",
      },
      select: {
        id: true,
        shopId: true,
        shop: {
          select: {
            id: true,
            sellerId: true,
          },
        },
      },
    });

    if (!product?.shop?.sellerId) {
      throw new NotFoundError("Product not found");
    }

    if (requestedShopId && requestedShopId !== product.shopId) {
      throw new ValidationError("Product does not belong to the selected shop");
    }

    const conversationKey = buildConversationKey({
      userId: participant.id,
      sellerId: product.shop.sellerId,
      shopId: product.shopId,
      productId: product.id,
    });
    let conversation = await prisma.conversation.findUnique({
      where: { conversationKey },
    });

    if (!conversation) {
      try {
        conversation = await prisma.conversation.create({
          data: {
            conversationKey,
            userId: participant.id,
            sellerId: product.shop.sellerId,
            shopId: product.shopId,
            productId: product.id,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") {
          throw error;
        }

        conversation = await prisma.conversation.findUnique({
          where: { conversationKey },
        });
      }
    }

    if (!conversation) {
      throw new Error("Unable to create conversation");
    }

    return res.status(200).json({
      success: true,
      conversation: await serializeConversationPayload(conversation, participant),
    });
  } catch (error) {
    return next(error);
  }
};

export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const participant = getAuthenticatedParticipant(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(
      getPositiveNumber(req.query.limit, CONVERSATION_LIMIT),
      50,
    );
    const skip = (page - 1) * limit;
    const where = getParticipantConversationWhere(participant);
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      conversations: await serializeConversationPayloads(
        conversations,
        participant,
      ),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { participant, conversation } = await getParticipantConversation(req);

    return res.status(200).json({
      success: true,
      conversation: await serializeConversationPayload(conversation, participant),
    });
  } catch (error) {
    return next(error);
  }
};

export const getConversationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { conversation } = await getParticipantConversation(req);
    const page = getPositiveNumber(req.query.page, 1);
    const limit = Math.min(getPositiveNumber(req.query.limit, MESSAGE_LIMIT), 50);
    const skip = (page - 1) * limit;
    const where = { conversationId: conversation.id };
    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      messages: messages.map(serializeMessage),
      pagination: getPagination(total, page, limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const markConversationSeen = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { participant, conversation } = await getParticipantConversation(req);
    const seenResult = await markConversationSeenForParticipant({
      conversationId: conversation.id,
      participantType: participant.role,
      participantId: participant.id,
    });

    return res.status(200).json({
      success: true,
      unreadCount: 0,
      conversation: seenResult.conversationPayload,
    });
  } catch (error) {
    return next(error);
  }
};
