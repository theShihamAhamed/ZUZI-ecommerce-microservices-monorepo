import prisma from "@libs/prisma";
import { ChatParticipantRole, getViewerUnreadCount } from "./chat.helpers";
import { setUnreadMirror } from "./chat-redis.helpers";
import { serializeConversationPayload } from "./chat.serializers";
import { ChatMessagePayload } from "../types/chat-events";

const getMessagePreview = (payload: ChatMessagePayload) => {
  const content = payload.content?.trim();

  if (content) {
    return content.length > 160 ? `${content.slice(0, 157)}...` : content;
  }

  return payload.attachments.length > 0 ? "Sent an image" : "";
};

const getReceiver = (
  conversation: {
    userId: string;
    sellerId: string;
  },
  senderType: ChatParticipantRole,
) => {
  return senderType === "user"
    ? {
        participantType: "seller" as const,
        participantId: conversation.sellerId,
      }
    : {
        participantType: "user" as const,
        participantId: conversation.userId,
      };
};

export const findParticipantConversation = async ({
  conversationId,
  participantType,
  participantId,
}: {
  conversationId: string;
  participantType: ChatParticipantRole;
  participantId: string;
}) => {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      ...(participantType === "user"
        ? { userId: participantId }
        : { sellerId: participantId }),
    },
  });
};

export const persistChatMessagePayload = async (
  payload: ChatMessagePayload,
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: payload.conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found for chat persistence");
  }

  const existingMessage = await prisma.chatMessage.findUnique({
    where: { clientMessageId: payload.clientMessageId },
  });
  const message =
    existingMessage ||
    (await prisma.chatMessage.create({
      data: {
        clientMessageId: payload.clientMessageId,
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        senderType: payload.senderType,
        content: payload.content || null,
        attachments: payload.attachments as any,
        status: "Sent",
        createdAt: new Date(payload.createdAt),
      },
    }));
  const receiver = getReceiver(conversation, payload.senderType);
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageId: message.id,
      lastMessageText: getMessagePreview(payload),
      lastMessageAt: message.createdAt,
      lastMessageSenderType: payload.senderType,
      ...(existingMessage
        ? {}
        : receiver.participantType === "user"
          ? { userUnreadCount: { increment: 1 } }
          : { sellerUnreadCount: { increment: 1 } }),
    },
  });
  const unreadCount = getViewerUnreadCount(updatedConversation, {
    id: receiver.participantId,
    role: receiver.participantType,
  });

  await setUnreadMirror({
    ...receiver,
    conversationId: conversation.id,
    unreadCount,
  });

  return {
    message,
    conversation: updatedConversation,
    receiver,
    unreadCount,
    duplicate: Boolean(existingMessage),
  };
};

export const markConversationSeenForParticipant = async ({
  conversationId,
  participantType,
  participantId,
}: {
  conversationId: string;
  participantType: ChatParticipantRole;
  participantId: string;
}) => {
  const conversation = await findParticipantConversation({
    conversationId,
    participantType,
    participantId,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const senderTypeToMarkSeen = participantType === "user" ? "seller" : "user";

  await prisma.chatMessage.updateMany({
    where: {
      conversationId,
      senderType: senderTypeToMarkSeen,
      status: {
        not: "Seen",
      },
    },
    data: {
      status: "Seen",
    },
  });

  const updatedConversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data:
      participantType === "user"
        ? { userUnreadCount: 0 }
        : { sellerUnreadCount: 0 },
  });

  await setUnreadMirror({
    participantType,
    participantId,
    conversationId,
    unreadCount: 0,
  });

  return {
    conversation: updatedConversation,
    conversationPayload: await serializeConversationPayload(
      updatedConversation,
      {
        id: participantId,
        role: participantType,
      },
    ),
  };
};
