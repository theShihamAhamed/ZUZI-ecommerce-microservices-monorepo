import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import {
  ConversationEventPayload,
  SendMessagePayload,
  ChatAttachment,
  ChatMessagePayload,
  ChatSocketErrorPayload,
} from "../types/chat-events";
import { getSocketParticipantFromCookie } from "../utils/chat-auth.helpers";
import {
  ChatParticipantRole,
  isObjectIdLike,
} from "../utils/chat.helpers";
import {
  CHAT_PRESENCE_TTL_SECONDS,
  clearParticipantOnline,
  getConversationRoom,
  getParticipantRoom,
  setParticipantOnline,
} from "../utils/chat-redis.helpers";
import {
  findParticipantConversation,
  markConversationSeenForParticipant,
} from "../utils/chat-persistence.helpers";
import { publishChatMessage } from "../utils/chat-kafka.helpers";
import { serializeConversationPayload } from "../utils/chat.serializers";

type ChatSocket = Socket & {
  data: {
    participant: {
      id: string;
      role: ChatParticipantRole;
    };
  };
};

const participantSockets = new Map<string, Set<string>>();
let presenceInterval: NodeJS.Timeout | null = null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getParticipantKey = (
  participantType: ChatParticipantRole,
  participantId: string,
) => `${participantType}:${participantId}`;

const emitSocketError = (
  socket: Socket,
  payload: ChatSocketErrorPayload,
) => {
  socket.emit("ERROR", payload);
};

const normalizeAttachment = (attachment: unknown): ChatAttachment | null => {
  if (!attachment || typeof attachment !== "object") return null;

  const candidate = attachment as Partial<ChatAttachment>;

  if (
    typeof candidate.url !== "string" ||
    candidate.url.trim().length === 0 ||
    candidate.type !== "image"
  ) {
    return null;
  }

  return {
    url: candidate.url.trim(),
    fileId:
      typeof candidate.fileId === "string" ? candidate.fileId.trim() : undefined,
    type: "image",
    name: typeof candidate.name === "string" ? candidate.name.trim() : undefined,
    size: typeof candidate.size === "number" ? candidate.size : undefined,
  };
};

const normalizeSendMessagePayload = (
  payload: SendMessagePayload,
): {
  conversationId: string;
  clientMessageId: string;
  content: string | null;
  attachments: ChatAttachment[];
} => {
  const conversationId =
    typeof payload?.conversationId === "string"
      ? payload.conversationId.trim()
      : "";
  const clientMessageId =
    typeof payload?.clientMessageId === "string"
      ? payload.clientMessageId.trim()
      : "";
  const content =
    typeof payload?.content === "string" && payload.content.trim().length > 0
      ? payload.content.trim()
      : null;
  const attachments = Array.isArray(payload?.attachments)
    ? payload.attachments.map(normalizeAttachment).filter(Boolean)
    : [];

  if (!isObjectIdLike(conversationId)) {
    throw new Error("Invalid conversation ID");
  }

  if (!clientMessageId) {
    throw new Error("clientMessageId is required");
  }

  if (attachments.length > 1) {
    throw new Error("Only one image attachment is allowed");
  }

  if (!content && attachments.length === 0) {
    throw new Error("Message content or image attachment is required");
  }

  return {
    conversationId,
    clientMessageId,
    content,
    attachments: attachments as ChatAttachment[],
  };
};

const getValidConversationId = (payload: ConversationEventPayload) => {
  const conversationId =
    typeof payload?.conversationId === "string"
      ? payload.conversationId.trim()
      : "";

  if (!isObjectIdLike(conversationId)) {
    throw new Error("Invalid conversation ID");
  }

  return conversationId;
};

const ensureConversationAccess = async (
  socket: ChatSocket,
  conversationId: string,
) => {
  const participant = socket.data.participant;
  const conversation = await findParticipantConversation({
    conversationId,
    participantType: participant.role,
    participantId: participant.id,
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
};

const addParticipantSocket = async (
  io: Server,
  socket: ChatSocket,
) => {
  const participant = socket.data.participant;
  const participantKey = getParticipantKey(participant.role, participant.id);
  const existingSockets = participantSockets.get(participantKey) || new Set();
  const wasOffline = existingSockets.size === 0;

  existingSockets.add(socket.id);
  participantSockets.set(participantKey, existingSockets);
  socket.join(getParticipantRoom(participant.role, participant.id));
  await setParticipantOnline(participant.role, participant.id);

  if (wasOffline) {
    io.emit("USER_ONLINE", {
      participantType: participant.role,
      participantId: participant.id,
    });
  }
};

const removeParticipantSocket = async (
  io: Server,
  socket: ChatSocket,
) => {
  const participant = socket.data.participant;
  const participantKey = getParticipantKey(participant.role, participant.id);
  const existingSockets = participantSockets.get(participantKey);

  if (!existingSockets) return;

  existingSockets.delete(socket.id);

  if (existingSockets.size > 0) {
    participantSockets.set(participantKey, existingSockets);
    return;
  }

  participantSockets.delete(participantKey);
  await clearParticipantOnline(participant.role, participant.id);
  io.emit("USER_OFFLINE", {
    participantType: participant.role,
    participantId: participant.id,
  });
};

const startPresenceRefresh = () => {
  if (presenceInterval) return;

  const intervalMs = Math.max(15000, CHAT_PRESENCE_TTL_SECONDS * 500);
  presenceInterval = setInterval(() => {
    for (const participantKey of participantSockets.keys()) {
      const [participantType, participantId] = participantKey.split(":") as [
        ChatParticipantRole,
        string,
      ];

      void setParticipantOnline(participantType, participantId);
    }
  }, intervalMs);
  presenceInterval.unref?.();
};

const handleJoinConversation = async (
  socket: ChatSocket,
  payload: ConversationEventPayload,
) => {
  try {
    const conversationId = getValidConversationId(payload);
    await ensureConversationAccess(socket, conversationId);
    socket.join(getConversationRoom(conversationId));
  } catch (error) {
    emitSocketError(socket, {
      code: "JOIN_CONVERSATION_FAILED",
      message: getErrorMessage(error),
      conversationId: payload?.conversationId,
    });
  }
};

const handleSendMessage = async (
  io: Server,
  socket: ChatSocket,
  payload: SendMessagePayload,
) => {
  let normalizedPayload:
    | ReturnType<typeof normalizeSendMessagePayload>
    | undefined;

  try {
    normalizedPayload = normalizeSendMessagePayload(payload);
    const participant = socket.data.participant;
    const conversation = await ensureConversationAccess(
      socket,
      normalizedPayload.conversationId,
    );
    const messagePayload: ChatMessagePayload = {
      conversationId: normalizedPayload.conversationId,
      clientMessageId: normalizedPayload.clientMessageId,
      senderId: participant.id,
      senderType: participant.role,
      content: normalizedPayload.content,
      attachments: normalizedPayload.attachments,
      createdAt: new Date().toISOString(),
    };
    const rooms = [
      getParticipantRoom("user", conversation.userId),
      getParticipantRoom("seller", conversation.sellerId),
      getConversationRoom(conversation.id),
    ];

    socket.join(getConversationRoom(conversation.id));
    io.to(rooms).emit("NEW_MESSAGE", { message: messagePayload });
    await publishChatMessage(messagePayload);
    socket.emit("MESSAGE_ACK", {
      conversationId: messagePayload.conversationId,
      clientMessageId: messagePayload.clientMessageId,
      accepted: true,
    });
  } catch (error) {
    emitSocketError(socket, {
      code: "SEND_MESSAGE_FAILED",
      message: getErrorMessage(error),
      conversationId: normalizedPayload?.conversationId || payload?.conversationId,
      clientMessageId:
        normalizedPayload?.clientMessageId || payload?.clientMessageId,
    });
  }
};

const handleMarkAsSeen = async (
  io: Server,
  socket: ChatSocket,
  payload: ConversationEventPayload,
) => {
  try {
    const participant = socket.data.participant;
    const conversationId = getValidConversationId(payload);
    const result = await markConversationSeenForParticipant({
      conversationId,
      participantType: participant.role,
      participantId: participant.id,
    });
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

    io.to(getConversationRoom(conversationId)).emit("MESSAGE_SEEN", {
      conversationId,
      seenByType: participant.role,
      seenById: participant.id,
    });
    io.to(getParticipantRoom(participant.role, participant.id)).emit(
      "UNSEEN_COUNT_UPDATE",
      {
        conversationId,
        participantType: participant.role,
        participantId: participant.id,
        unreadCount: 0,
      },
    );
    io.to(getParticipantRoom("user", result.conversation.userId)).emit(
      "CONVERSATION_UPDATED",
      {
        conversation: userConversationPayload,
      },
    );
    io.to(getParticipantRoom("seller", result.conversation.sellerId)).emit(
      "CONVERSATION_UPDATED",
      {
        conversation: sellerConversationPayload,
      },
    );
  } catch (error) {
    emitSocketError(socket, {
      code: "MARK_AS_SEEN_FAILED",
      message: getErrorMessage(error),
      conversationId: payload?.conversationId,
    });
  }
};

const handleTyping = async (
  socket: ChatSocket,
  payload: ConversationEventPayload,
  eventName: "TYPING_START" | "TYPING_STOP",
) => {
  try {
    const participant = socket.data.participant;
    const conversationId = getValidConversationId(payload);
    await ensureConversationAccess(socket, conversationId);
    socket.join(getConversationRoom(conversationId));
    socket.to(getConversationRoom(conversationId)).emit(eventName, {
      conversationId,
      participantType: participant.role,
      participantId: participant.id,
    });
  } catch (error) {
    emitSocketError(socket, {
      code: `${eventName}_FAILED`,
      message: getErrorMessage(error),
      conversationId: payload?.conversationId,
    });
  }
};

export const initializeChatSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const participant = await getSocketParticipantFromCookie(
        socket.handshake.headers.cookie,
      );

      if (!participant) {
        return next(new Error("Unauthorized"));
      }

      (socket as ChatSocket).data.participant = participant;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const chatSocket = socket as ChatSocket;
    const participant = chatSocket.data.participant;

    void addParticipantSocket(io, chatSocket);
    chatSocket.emit("READY", {
      participantType: participant.role,
      participantId: participant.id,
    });

    chatSocket.on("JOIN_CONVERSATION", (payload: ConversationEventPayload) => {
      void handleJoinConversation(chatSocket, payload);
    });
    chatSocket.on("SEND_MESSAGE", (payload: SendMessagePayload) => {
      void handleSendMessage(io, chatSocket, payload);
    });
    chatSocket.on("MARK_AS_SEEN", (payload: ConversationEventPayload) => {
      void handleMarkAsSeen(io, chatSocket, payload);
    });
    chatSocket.on("TYPING_START", (payload: ConversationEventPayload) => {
      void handleTyping(chatSocket, payload, "TYPING_START");
    });
    chatSocket.on("TYPING_STOP", (payload: ConversationEventPayload) => {
      void handleTyping(chatSocket, payload, "TYPING_STOP");
    });
    chatSocket.on("PING", () => {
      void setParticipantOnline(participant.role, participant.id);
    });
    chatSocket.on("disconnect", () => {
      void removeParticipantSocket(io, chatSocket);
    });
  });

  startPresenceRefresh();
  console.log("Socket.IO chat server attached");

  return io;
};
