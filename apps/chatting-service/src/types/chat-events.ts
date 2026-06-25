import { ChatParticipantRole } from "../utils/chat.helpers";

export interface ChatAttachment {
  url: string;
  fileId?: string;
  type: "image";
  name?: string;
  size?: number;
}

export interface ChatMessagePayload {
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  senderType: ChatParticipantRole;
  content?: string | null;
  attachments: ChatAttachment[];
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId?: string;
  clientMessageId?: string;
  content?: string;
  attachments?: ChatAttachment[];
}

export interface ConversationEventPayload {
  conversationId?: string;
}

export interface ChatSocketErrorPayload {
  code: string;
  message: string;
  conversationId?: string;
  clientMessageId?: string;
}

export interface PersistedMessageEventPayload {
  clientMessageId: string;
  message: unknown;
}

export interface UnseenCountUpdatePayload {
  conversationId: string;
  participantType: ChatParticipantRole;
  participantId: string;
  unreadCount: number;
}

export interface TypingEventPayload {
  conversationId: string;
  participantType: ChatParticipantRole;
  participantId: string;
}
