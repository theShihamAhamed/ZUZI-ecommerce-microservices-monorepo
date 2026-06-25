import { ChatConversation, ChatImage } from "@/types/chat";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

export const getChatImageUrl = (
  image?: ChatImage[] | ChatImage | string | null,
) => {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return image[0]?.url;
  return image.url;
};

export const getConversationTitle = (conversation?: ChatConversation | null) => {
  return (
    conversation?.user?.name ||
    conversation?.participant?.name ||
    "Customer"
  );
};

export const getConversationSubtitle = (
  conversation?: ChatConversation | null,
) => {
  return (
    conversation?.product?.title ||
    conversation?.shop?.name ||
    "Customer conversation"
  );
};

export const getConversationAvatarUrl = (
  conversation?: ChatConversation | null,
) => {
  return getChatImageUrl(conversation?.user?.avatar);
};

export const getConversationInitials = (
  conversation?: ChatConversation | null,
) => {
  const title = getConversationTitle(conversation);

  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
};

export const getProductImageUrl = (
  conversation?: ChatConversation | null,
) => {
  return conversation?.product?.image?.url || PRODUCT_PLACEHOLDER_IMAGE;
};

export const formatChatTime = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getLastMessagePreview = (conversation: ChatConversation) => {
  if (conversation.lastMessageText) return conversation.lastMessageText;
  if (conversation.lastMessageId) return "Image message";
  return "Waiting for the first message";
};
