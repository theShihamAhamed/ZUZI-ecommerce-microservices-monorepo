"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import {
  chatConversationQueryKey,
  chatConversationsQueryKey,
  chatMessagesQueryKey,
} from "@/hooks/useChat";
import {
  ChatAttachment,
  ChatConnectionStatus,
  ChatConversation,
  ChatConversationResponse,
  ChatConversationsResponse,
  ChatMessage,
  ChatMessagesResponse,
  ChatSocketError,
  ConversationUpdatedEvent,
  MessageAckEvent,
  MessagePersistedEvent,
  MessageSeenEvent,
  TypingEvent,
  UnseenCountUpdateEvent,
} from "@/types/chat";

interface PresenceEvent {
  participantType: "user" | "seller";
  participantId: string;
}

interface SendMessageInput {
  conversationId: string;
  clientMessageId: string;
  content?: string | null;
  attachments?: ChatAttachment[];
}

interface WebSocketContextValue {
  connectionStatus: ChatConnectionStatus;
  latestMessage: ChatMessage | null;
  latestError: ChatSocketError | null;
  typingEvents: Record<string, TypingEvent | null>;
  joinConversation: (conversationId: string) => void;
  sendMessage: (input: SendMessageInput) => void;
  markAsSeen: (conversationId: string) => void;
  typingStart: (conversationId: string) => void;
  typingStop: (conversationId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const getSocketUrl = () => process.env.NEXT_PUBLIC_WEBSOCKET_URI || "";

const emptyMessagesResponse = (
  conversationId: string,
): ChatMessagesResponse => ({
  success: true,
  messages: [],
  pagination: {
    total: 0,
    totalCount: 0,
    totalItems: 0,
    currentPage: 1,
    page: 1,
    limit: 30,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

const upsertMessage = (
  data: ChatMessagesResponse | undefined,
  message: ChatMessage,
) => {
  const current = data || emptyMessagesResponse(message.conversationId);
  const existingIndex = current.messages.findIndex(
    (item) => item.clientMessageId === message.clientMessageId,
  );
  const messages =
    existingIndex >= 0
      ? current.messages.map((item, index) =>
          index === existingIndex ? { ...item, ...message } : item,
        )
      : [...current.messages, message];

  return {
    ...current,
    messages: messages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  };
};

const updateMessageByClientId = (
  data: ChatMessagesResponse | undefined,
  clientMessageId: string,
  updater: (message: ChatMessage) => ChatMessage,
) => {
  if (!data) return data;

  return {
    ...data,
    messages: data.messages.map((message) =>
      message.clientMessageId === clientMessageId ? updater(message) : message,
    ),
  };
};

const upsertConversation = (
  data: ChatConversationsResponse | undefined,
  conversation: ChatConversation,
) => {
  if (!data) return data;

  const existingIndex = data.conversations.findIndex(
    (item) => item.id === conversation.id,
  );
  const conversations =
    existingIndex >= 0
      ? data.conversations.map((item, index) =>
          index === existingIndex ? { ...item, ...conversation } : item,
        )
      : [conversation, ...data.conversations];

  return {
    ...data,
    conversations: conversations.sort((a, b) => {
      const aTime = a.lastMessageAt || a.updatedAt;
      const bTime = b.lastMessageAt || b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }),
  };
};

const updateConversationPresence = (
  data: ChatConversationsResponse | undefined,
  event: PresenceEvent,
  online: boolean,
) => {
  if (!data) return data;

  return {
    ...data,
    conversations: data.conversations.map((conversation) => {
      const matchesParticipant =
        event.participantType === "seller"
          ? conversation.sellerId === event.participantId
          : conversation.userId === event.participantId;

      return matchesParticipant ? { ...conversation, online } : conversation;
    }),
  };
};

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { fetchUser } = useAuth();
  const user = fetchUser.data;
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>("idle");
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const [latestError, setLatestError] = useState<ChatSocketError | null>(null);
  const [typingEvents, setTypingEvents] = useState<
    Record<string, TypingEvent | null>
  >({});

  useEffect(() => {
    const socketUrl = getSocketUrl();

    if (!user?.id || !socketUrl) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnectionStatus(user?.id ? "error" : "idle");
      return;
    }

    setConnectionStatus("connecting");

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      setLatestError(null);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      setConnectionStatus("error");
      setLatestError({
        code: "CONNECT_ERROR",
        message: error.message,
      });
    });

    socket.on("READY", () => {
      setConnectionStatus("connected");
    });

    socket.on("NEW_MESSAGE", ({ message }: { message: ChatMessage }) => {
      const nextMessage: ChatMessage = {
        ...message,
        status: message.status || "Sent",
        attachments: message.attachments || [],
        localStatus: message.id ? "persisted" : "sent",
      };

      setLatestMessage(nextMessage);
      queryClient.setQueryData(
        chatMessagesQueryKey(nextMessage.conversationId),
        (data: ChatMessagesResponse | undefined) =>
          upsertMessage(data, nextMessage),
      );
    });

    socket.on("MESSAGE_ACK", (event: MessageAckEvent) => {
      queryClient.setQueryData(
        chatMessagesQueryKey(event.conversationId),
        (data: ChatMessagesResponse | undefined) =>
          updateMessageByClientId(data, event.clientMessageId, (message) => ({
            ...message,
            localStatus: event.accepted ? "sent" : "failed",
          })),
      );
    });

    socket.on("MESSAGE_PERSISTED", (event: MessagePersistedEvent) => {
      const persistedMessage: ChatMessage = {
        ...event.message,
        attachments: event.message.attachments || [],
        localStatus: "persisted",
      };

      queryClient.setQueryData(
        chatMessagesQueryKey(persistedMessage.conversationId),
        (data: ChatMessagesResponse | undefined) =>
          upsertMessage(data, persistedMessage),
      );
    });

    socket.on("CONVERSATION_UPDATED", (event: ConversationUpdatedEvent) => {
      queryClient.setQueryData(
        chatConversationsQueryKey,
        (data: ChatConversationsResponse | undefined) =>
          upsertConversation(data, event.conversation),
      );
      queryClient.setQueryData<ChatConversationResponse>(
        chatConversationQueryKey(event.conversation.id),
        {
          success: true,
          conversation: event.conversation,
        },
      );
    });

    socket.on("UNSEEN_COUNT_UPDATE", (event: UnseenCountUpdateEvent) => {
      queryClient.setQueryData(
        chatConversationsQueryKey,
        (data: ChatConversationsResponse | undefined) => {
          if (!data) return data;

          return {
            ...data,
            conversations: data.conversations.map((conversation) =>
              conversation.id === event.conversationId
                ? {
                    ...conversation,
                    unreadCount: event.unreadCount,
                    userUnreadCount:
                      event.participantType === "user"
                        ? event.unreadCount
                        : conversation.userUnreadCount,
                    sellerUnreadCount:
                      event.participantType === "seller"
                        ? event.unreadCount
                        : conversation.sellerUnreadCount,
                  }
                : conversation,
            ),
          };
        },
      );
    });

    socket.on("MESSAGE_SEEN", (event: MessageSeenEvent) => {
      queryClient.setQueryData(
        chatMessagesQueryKey(event.conversationId),
        (data: ChatMessagesResponse | undefined) => {
          if (!data) return data;

          return {
            ...data,
            messages: data.messages.map((message) =>
              message.senderType !== event.seenByType
                ? { ...message, status: "Seen" }
                : message,
            ),
          };
        },
      );
    });

    socket.on("TYPING_START", (event: TypingEvent) => {
      setTypingEvents((current) => ({
        ...current,
        [event.conversationId]: event,
      }));
    });

    socket.on("TYPING_STOP", (event: TypingEvent) => {
      setTypingEvents((current) => ({
        ...current,
        [event.conversationId]: null,
      }));
    });

    socket.on("ERROR", (error: ChatSocketError) => {
      setLatestError(error);
      if (error.conversationId && error.clientMessageId) {
        queryClient.setQueryData(
          chatMessagesQueryKey(error.conversationId),
          (data: ChatMessagesResponse | undefined) =>
            updateMessageByClientId(
              data,
              error.clientMessageId || "",
              (message) => ({
                ...message,
                localStatus: "failed",
              }),
            ),
        );
      }
    });

    socket.on("USER_ONLINE", (event: PresenceEvent) => {
      queryClient.setQueryData(
        chatConversationsQueryKey,
        (data: ChatConversationsResponse | undefined) =>
          updateConversationPresence(data, event, true),
      );
    });

    socket.on("USER_OFFLINE", (event: PresenceEvent) => {
      queryClient.setQueryData(
        chatConversationsQueryKey,
        (data: ChatConversationsResponse | undefined) =>
          updateConversationPresence(data, event, false),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionStatus("idle");
    };
  }, [queryClient, user?.id]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("JOIN_CONVERSATION", { conversationId });
  }, []);

  const sendMessage = useCallback((input: SendMessageInput) => {
    socketRef.current?.emit("SEND_MESSAGE", input);
  }, []);

  const markAsSeen = useCallback((conversationId: string) => {
    socketRef.current?.emit("MARK_AS_SEEN", { conversationId });
  }, []);

  const typingStart = useCallback((conversationId: string) => {
    socketRef.current?.emit("TYPING_START", { conversationId });
  }, []);

  const typingStop = useCallback((conversationId: string) => {
    socketRef.current?.emit("TYPING_STOP", { conversationId });
  }, []);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      connectionStatus,
      latestMessage,
      latestError,
      typingEvents,
      joinConversation,
      sendMessage,
      markAsSeen,
      typingStart,
      typingStop,
    }),
    [
      connectionStatus,
      joinConversation,
      latestError,
      latestMessage,
      markAsSeen,
      sendMessage,
      typingEvents,
      typingStart,
      typingStop,
    ],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useChatWebSocket = () => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error("useChatWebSocket must be used within WebSocketProvider");
  }

  return context;
};
