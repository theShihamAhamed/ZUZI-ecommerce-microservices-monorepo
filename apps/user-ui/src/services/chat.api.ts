import axiosInstance from "@/libs/axios";
import {
  ChatConversationResponse,
  ChatConversationsResponse,
  ChatMessagesResponse,
  ChatUploadImageResponse,
  CreateOrGetConversationInput,
} from "@/types/chat";

const getGatewayUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return apiUrl.replace(/\/$/, "");
};

const chatUrl = (path: string) => `${getGatewayUrl()}/chat/api${path}`;

export const createOrGetConversationApi = async ({
  productId,
  shopId,
}: CreateOrGetConversationInput): Promise<ChatConversationResponse> => {
  const res = await axiosInstance.post<ChatConversationResponse>(
    chatUrl("/conversations"),
    {
      productId,
      ...(shopId ? { shopId } : {}),
    },
  );

  return res.data;
};

export const getConversationsApi = async ({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<ChatConversationsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await axiosInstance.get<ChatConversationsResponse>(
    chatUrl(`/conversations?${params.toString()}`),
  );

  return res.data;
};

export const getConversationApi = async (
  conversationId: string,
): Promise<ChatConversationResponse> => {
  const res = await axiosInstance.get<ChatConversationResponse>(
    chatUrl(`/conversations/${conversationId}`),
  );

  return res.data;
};

export const getMessagesApi = async ({
  conversationId,
  page = 1,
  limit = 30,
}: {
  conversationId: string;
  page?: number;
  limit?: number;
}): Promise<ChatMessagesResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await axiosInstance.get<ChatMessagesResponse>(
    chatUrl(`/conversations/${conversationId}/messages?${params.toString()}`),
  );

  return res.data;
};

export const markConversationSeenApi = async (
  conversationId: string,
): Promise<ChatConversationResponse> => {
  const res = await axiosInstance.post<ChatConversationResponse>(
    chatUrl(`/conversations/${conversationId}/seen`),
  );

  return res.data;
};

export const uploadChatImageApi = async (
  file: File,
): Promise<ChatUploadImageResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await axiosInstance.post<ChatUploadImageResponse>(
    chatUrl("/uploads/image"),
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};
