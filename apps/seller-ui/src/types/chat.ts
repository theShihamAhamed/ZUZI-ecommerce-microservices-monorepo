export type ChatParticipantType = "user" | "seller";
export type ChatMessageStatus = "Sent" | "Delivered" | "Seen";
export type ChatConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface ChatImage {
  url: string;
  fileId?: string;
}

export interface ChatAttachment {
  url: string;
  fileId?: string;
  type: "image";
  name?: string;
  size?: number;
}

export interface ChatUserSummary {
  id: string;
  name: string;
  email?: string;
  avatar?: ChatImage | null;
}

export interface ChatSellerSummary {
  id: string;
  name: string;
  email?: string;
  status?: string;
}

export interface ChatShopSummary {
  id: string;
  name: string;
  category?: string | null;
  ratings?: number | null;
  avatar?: ChatImage | null;
  coverBanner?: ChatImage | null;
  address?: string | null;
}

export interface ChatProductSummary {
  id: string;
  title: string;
  slug: string;
  image?: ChatImage | null;
  sale_price?: number;
  regular_price?: number;
}

export interface ChatConversation {
  id: string;
  conversationKey: string;
  userId: string;
  sellerId: string;
  shopId?: string | null;
  productId?: string | null;
  lastMessageId?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  lastMessageSenderType?: ChatParticipantType | null;
  unreadCount: number;
  userUnreadCount: number;
  sellerUnreadCount: number;
  online?: boolean | null;
  participant?: ChatUserSummary | ChatSellerSummary | null;
  user?: ChatUserSummary | null;
  seller?: ChatSellerSummary | null;
  shop?: ChatShopSummary | null;
  product?: ChatProductSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id?: string;
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  senderType: ChatParticipantType;
  content?: string | null;
  attachments: ChatAttachment[];
  status: ChatMessageStatus;
  createdAt: string;
  updatedAt?: string;
  localStatus?: "sending" | "sent" | "persisted" | "failed";
}

export interface ChatPagination {
  total: number;
  totalCount?: number;
  totalItems?: number;
  currentPage?: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ChatConversationsResponse {
  success: boolean;
  conversations: ChatConversation[];
  pagination: ChatPagination;
}

export interface ChatConversationResponse {
  success: boolean;
  conversation: ChatConversation;
}

export interface ChatMessagesResponse {
  success: boolean;
  messages: ChatMessage[];
  pagination: ChatPagination;
}

export interface ChatUploadImageResponse {
  success: boolean;
  attachment: ChatAttachment;
}

export interface ChatSocketError {
  code: string;
  message: string;
  conversationId?: string;
  clientMessageId?: string;
}

export interface MessageAckEvent {
  conversationId: string;
  clientMessageId: string;
  accepted: boolean;
}

export interface MessagePersistedEvent {
  clientMessageId: string;
  message: ChatMessage;
}

export interface ConversationUpdatedEvent {
  conversation: ChatConversation;
}

export interface UnseenCountUpdateEvent {
  conversationId: string;
  participantType: ChatParticipantType;
  participantId: string;
  unreadCount: number;
}

export interface MessageSeenEvent {
  conversationId: string;
  seenByType: ChatParticipantType;
  seenById: string;
}

export interface TypingEvent {
  conversationId: string;
  participantType: ChatParticipantType;
  participantId: string;
}
