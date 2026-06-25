"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrGetConversationApi,
  getConversationApi,
  getConversationsApi,
  getMessagesApi,
  markConversationSeenApi,
  uploadChatImageApi,
} from "@/services/chat.api";
import {
  ChatConversationResponse,
  ChatMessagesResponse,
  CreateOrGetConversationInput,
} from "@/types/chat";

export const chatConversationsQueryKey = ["chat-conversations"] as const;

export const chatConversationQueryKey = (conversationId: string) =>
  ["chat-conversation", conversationId] as const;

export const chatMessagesQueryKey = (conversationId: string) =>
  ["chat-messages", conversationId] as const;

export const useChatConversations = (enabled = true) => {
  return useQuery({
    queryKey: chatConversationsQueryKey,
    queryFn: () => getConversationsApi(),
    enabled,
    retry: 1,
  });
};

export const useChatConversation = (
  conversationId: string | null | undefined,
) => {
  return useQuery({
    queryKey: chatConversationQueryKey(conversationId || ""),
    queryFn: () => getConversationApi(conversationId || ""),
    enabled: Boolean(conversationId),
    retry: 1,
  });
};

export const useChatMessages = (
  conversationId: string | null | undefined,
) => {
  return useQuery({
    queryKey: chatMessagesQueryKey(conversationId || ""),
    queryFn: () => getMessagesApi({ conversationId: conversationId || "" }),
    enabled: Boolean(conversationId),
    retry: 1,
  });
};

export const useCreateOrGetConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrGetConversationInput) =>
      createOrGetConversationApi(input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        chatConversationQueryKey(data.conversation.id),
        data,
      );
      queryClient.invalidateQueries({ queryKey: chatConversationsQueryKey });
    },
  });
};

export const useMarkConversationSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markConversationSeenApi,
    onSuccess: (data: ChatConversationResponse) => {
      queryClient.setQueryData(
        chatConversationQueryKey(data.conversation.id),
        data,
      );
      queryClient.invalidateQueries({ queryKey: chatConversationsQueryKey });
    },
  });
};

export const useUploadChatImage = () => {
  return useMutation({
    mutationFn: uploadChatImageApi,
  });
};

export const setChatMessagesQueryData = (
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  updater: (data: ChatMessagesResponse | undefined) => ChatMessagesResponse,
) => {
  queryClient.setQueryData(
    chatMessagesQueryKey(conversationId),
    (data: ChatMessagesResponse | undefined) => updater(data),
  );
};
