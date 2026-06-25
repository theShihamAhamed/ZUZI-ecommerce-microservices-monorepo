import { Server } from "socket.io";
import { kafka } from "@packages/utils/kafka";
import {
  CHAT_KAFKA_GROUP_ID,
  CHAT_KAFKA_TOPIC,
  shouldSkipChatKafka,
} from "../utils/chat-kafka.helpers";
import {
  getConversationRoom,
  getParticipantRoom,
} from "../utils/chat-redis.helpers";
import { persistChatMessagePayload } from "../utils/chat-persistence.helpers";
import {
  serializeConversationPayload,
  serializeMessage,
} from "../utils/chat.serializers";
import { ChatMessagePayload } from "../types/chat-events";

const toPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const FLUSH_INTERVAL_MS = toPositiveNumber(
  process.env.CHAT_MESSAGE_FLUSH_INTERVAL_MS,
  3000,
);
const MAX_BATCH_SIZE = toPositiveNumber(
  process.env.CHAT_MESSAGE_FLUSH_MAX_BATCH,
  100,
);
const RETRY_BACKOFF_MS = toPositiveNumber(
  process.env.CHAT_MESSAGE_FLUSH_RETRY_BACKOFF_MS,
  3000,
);

const queue: ChatMessagePayload[] = [];
let consumer: ReturnType<typeof kafka.consumer> | null = null;
let flushInterval: NodeJS.Timeout | null = null;
let retryTimeout: NodeJS.Timeout | null = null;
let isFlushing = false;
let isStarted = false;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isChatMessagePayload = (value: unknown): value is ChatMessagePayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<ChatMessagePayload>;
  return (
    typeof payload.conversationId === "string" &&
    typeof payload.clientMessageId === "string" &&
    typeof payload.senderId === "string" &&
    (payload.senderType === "user" || payload.senderType === "seller") &&
    typeof payload.createdAt === "string" &&
    Array.isArray(payload.attachments)
  );
};

const parseKafkaMessage = (messageValue: string) => {
  try {
    const payload = JSON.parse(messageValue);

    if (!isChatMessagePayload(payload)) {
      console.warn("Ignored chat Kafka message: invalid payload");
      return null;
    }

    return payload;
  } catch (error) {
    console.warn("Ignored chat Kafka message: invalid JSON", {
      error: getErrorMessage(error),
    });
    return null;
  }
};

const dedupeBatch = (batch: ChatMessagePayload[]) => {
  const seen = new Set<string>();
  const deduped: ChatMessagePayload[] = [];

  for (const payload of batch) {
    if (seen.has(payload.clientMessageId)) continue;

    seen.add(payload.clientMessageId);
    deduped.push(payload);
  }

  return deduped;
};

const emitPersistenceEvents = async (
  io: Server,
  result: Awaited<ReturnType<typeof persistChatMessagePayload>>,
) => {
  const message = serializeMessage(result.message);
  const userConversationPayload = await serializeConversationPayload(
    result.conversation,
    {
      id: result.conversation.userId,
      role: "user",
    },
  );
  const sellerConversationPayload = await serializeConversationPayload(
    result.conversation,
    {
      id: result.conversation.sellerId,
      role: "seller",
    },
  );
  const userRoom = getParticipantRoom("user", result.conversation.userId);
  const sellerRoom = getParticipantRoom("seller", result.conversation.sellerId);
  const conversationRoom = getConversationRoom(result.conversation.id);

  io.to([userRoom, sellerRoom, conversationRoom]).emit("MESSAGE_PERSISTED", {
    clientMessageId: result.message.clientMessageId,
    message,
  });
  io.to(userRoom).emit("CONVERSATION_UPDATED", {
    conversation: userConversationPayload,
  });
  io.to(sellerRoom).emit("CONVERSATION_UPDATED", {
    conversation: sellerConversationPayload,
  });
  io.to(getParticipantRoom(result.receiver.participantType, result.receiver.participantId)).emit(
    "UNSEEN_COUNT_UPDATE",
    {
      conversationId: result.conversation.id,
      participantType: result.receiver.participantType,
      participantId: result.receiver.participantId,
      unreadCount: result.unreadCount,
    },
  );
};

const scheduleRetry = (io: Server) => {
  if (retryTimeout) return;

  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    void flushChatMessageQueue(io);
  }, RETRY_BACKOFF_MS);
};

export const flushChatMessageQueue = async (io: Server) => {
  if (isFlushing || queue.length === 0) return;

  isFlushing = true;
  const batch = dedupeBatch(queue.splice(0, queue.length));

  try {
    for (const payload of batch) {
      const result = await persistChatMessagePayload(payload);
      await emitPersistenceEvents(io, result);
    }
  } catch (error) {
    queue.unshift(...batch);
    console.error("Chat message flush failed", {
      batchSize: batch.length,
      error: getErrorMessage(error),
    });
    scheduleRetry(io);
  } finally {
    isFlushing = false;
  }
};

export const startChatMessageConsumer = async (io: Server) => {
  if (isStarted || shouldSkipChatKafka()) return;
  isStarted = true;

  consumer = kafka.consumer({
    groupId: CHAT_KAFKA_GROUP_ID,
    sessionTimeout: Number(process.env.KAFKA_SESSION_TIMEOUT_MS) || 30000,
    heartbeatInterval: Number(process.env.KAFKA_HEARTBEAT_INTERVAL_MS) || 3000,
    maxWaitTimeInMs: Number(process.env.KAFKA_MAX_WAIT_TIME_MS) || 5000,
  });

  consumer.on(consumer.events.CRASH, (event) => {
    console.error("Chat Kafka consumer crashed", {
      groupId: CHAT_KAFKA_GROUP_ID,
      error: getErrorMessage(event.payload.error),
      restart: event.payload.restart,
    });
  });

  await consumer.connect();
  await consumer.subscribe({
    topic: CHAT_KAFKA_TOPIC,
    fromBeginning: process.env.CHAT_KAFKA_FROM_BEGINNING === "true",
  });
  console.log("Chat Kafka consumer connected", {
    topic: CHAT_KAFKA_TOPIC,
    groupId: CHAT_KAFKA_GROUP_ID,
  });

  flushInterval = setInterval(() => {
    void flushChatMessageQueue(io);
  }, FLUSH_INTERVAL_MS);

  await consumer.run({
    partitionsConsumedConcurrently: 1,
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const payload = parseKafkaMessage(message.value.toString());
      if (!payload) return;

      queue.push(payload);

      if (queue.length >= MAX_BATCH_SIZE) {
        void flushChatMessageQueue(io);
      }
    },
  });
};

export const stopChatMessageConsumer = async (io: Server) => {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }

  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  await flushChatMessageQueue(io);
  await consumer?.disconnect();
  consumer = null;
  isStarted = false;
};
