import axiosInstance from "@/lib/axios";
import {
  ChatConversationResponse,
  ChatConversationsResponse,
  ChatMessagesResponse,
  ChatUploadImageResponse,
} from "@/types/chat";

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
    `/chat/api/conversations?${params.toString()}`,
  );

  return res.data;
};

export const getConversationApi = async (
  conversationId: string,
): Promise<ChatConversationResponse> => {
  const res = await axiosInstance.get<ChatConversationResponse>(
    `/chat/api/conversations/${conversationId}`,
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
    `/chat/api/conversations/${conversationId}/messages?${params.toString()}`,
  );

  return res.data;
};

export const markConversationSeenApi = async (
  conversationId: string,
): Promise<ChatConversationResponse> => {
  const res = await axiosInstance.post<ChatConversationResponse>(
    `/chat/api/conversations/${conversationId}/seen`,
  );

  return res.data;
};

export const uploadChatImageApi = async (
  file: File,
): Promise<ChatUploadImageResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await axiosInstance.post<ChatUploadImageResponse>(
    "/chat/api/uploads/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};
