import redis from "@libs/redis";
import { ChatParticipantRole } from "./chat.helpers";

const toPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const CHAT_PRESENCE_TTL_SECONDS = toPositiveNumber(
  process.env.CHAT_PRESENCE_TTL_SECONDS,
  60,
);

export const getParticipantRoom = (
  participantType: ChatParticipantRole,
  participantId: string,
) => `${participantType}:${participantId}`;

export const getConversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;

const getOnlineKey = (
  participantType: ChatParticipantRole,
  participantId: string,
) => `online:${participantType}:${participantId}`;

const getUnreadKey = (
  participantType: ChatParticipantRole,
  participantId: string,
  conversationId: string,
) => `unseen:${participantType}:${participantId}:${conversationId}`;

export const setParticipantOnline = async (
  participantType: ChatParticipantRole,
  participantId: string,
) => {
  await redis.set(
    getOnlineKey(participantType, participantId),
    "1",
    "EX",
    CHAT_PRESENCE_TTL_SECONDS,
  );
};

export const clearParticipantOnline = async (
  participantType: ChatParticipantRole,
  participantId: string,
) => {
  await redis.del(getOnlineKey(participantType, participantId));
};

export const setUnreadMirror = async ({
  participantType,
  participantId,
  conversationId,
  unreadCount,
}: {
  participantType: ChatParticipantRole;
  participantId: string;
  conversationId: string;
  unreadCount: number;
}) => {
  const key = getUnreadKey(participantType, participantId, conversationId);

  if (unreadCount <= 0) {
    await redis.del(key);
    return;
  }

  await redis.set(key, String(unreadCount));
};
