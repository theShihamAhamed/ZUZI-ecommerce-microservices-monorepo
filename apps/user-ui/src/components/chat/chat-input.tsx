"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import {
  ImageUploadButton,
  ImageUploadPreview,
} from "@/components/chat/image-upload-preview";
import { useAuth } from "@/hooks/useAuth";
import { chatMessagesQueryKey, useUploadChatImage } from "@/hooks/useChat";
import { useChatWebSocket } from "@/providers/websocket-provider";
import { ChatAttachment, ChatMessage, ChatMessagesResponse } from "@/types/chat";

interface ChatInputProps {
  conversationId: string;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const createClientMessageId = () => {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
};

const emptyMessagesResponse = (
  conversationId: string,
): ChatMessagesResponse => ({
  success: true,
  messages: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

const addOptimisticMessage = (
  data: ChatMessagesResponse | undefined,
  conversationId: string,
  message: ChatMessage,
) => {
  const current = data || emptyMessagesResponse(conversationId);

  return {
    ...current,
    messages: [...current.messages, message],
  };
};

export function ChatInput({ conversationId, disabled }: ChatInputProps) {
  const queryClient = useQueryClient();
  const { fetchUser } = useAuth();
  const currentUser = fetchUser.data;
  const uploadImage = useUploadChatImage();
  const { sendMessage, typingStart, typingStop, connectionStatus } =
    useChatWebSocket();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canSend = Boolean(message.trim() || selectedFile);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [previewUrl]);

  const handleImageChange = (file: File | null) => {
    setError("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Select a valid image file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be 5MB or smaller.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleTyping = (value: string) => {
    setMessage(value);

    if (!conversationId || disabled) return;

    typingStart(conversationId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingStop(conversationId);
    }, 900);
  };

  const sendCurrentMessage = async () => {
    setError("");

    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    if (!currentUser?.id) {
      setError("Please log in to send a message.");
      return;
    }

    let attachments: ChatAttachment[] = [];

    try {
      if (selectedFile) {
        const uploadResponse = await uploadImage.mutateAsync(selectedFile);
        attachments = [uploadResponse.attachment];
      }

      const clientMessageId = createClientMessageId();
      const optimisticMessage: ChatMessage = {
        clientMessageId,
        conversationId,
        senderId: currentUser.id,
        senderType: "user",
        content: trimmedMessage || null,
        attachments,
        status: "Sent",
        localStatus: "sending",
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        chatMessagesQueryKey(conversationId),
        (data: ChatMessagesResponse | undefined) =>
          addOptimisticMessage(data, conversationId, optimisticMessage),
      );

      sendMessage({
        conversationId,
        clientMessageId,
        content: trimmedMessage || null,
        attachments,
      });
      typingStop(conversationId);
      setMessage("");
      handleImageChange(null);
    } catch (sendError) {
      setError(
        (sendError as any)?.response?.data?.message ||
          "Unable to send this message. Please try again.",
      );
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendCurrentMessage();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-stone-200 bg-white p-3 sm:p-4"
    >
      <ImageUploadPreview
        file={selectedFile}
        previewUrl={previewUrl}
        isUploading={uploadImage.isPending}
        onChange={handleImageChange}
      />

      {error ? (
        <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex min-w-0 items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
        <EmojiPicker onSelect={(emoji) => handleTyping(`${message}${emoji}`)} />

        <textarea
          value={message}
          onChange={(event) => handleTyping(event.target.value)}
          disabled={disabled || uploadImage.isPending}
          rows={1}
          placeholder={
            connectionStatus === "connected"
              ? "Message the seller..."
              : "Connecting to chat..."
          }
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendCurrentMessage();
            }
          }}
        />

        <ImageUploadButton
          isUploading={uploadImage.isPending}
          onChange={handleImageChange}
        />

        <button
          type="submit"
          aria-label="Send message"
          disabled={
            disabled ||
            uploadImage.isPending ||
            !canSend ||
            connectionStatus !== "connected"
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
