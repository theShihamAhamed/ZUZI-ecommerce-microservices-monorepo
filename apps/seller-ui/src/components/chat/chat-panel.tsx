"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink, MessageCircle, Package } from "lucide-react";
import { useEffect, useRef } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import {
  getConversationAvatarUrl,
  getConversationInitials,
  getConversationSubtitle,
  getConversationTitle,
  getProductImageUrl,
} from "@/components/chat/chat-ui.helpers";
import {
  useChatConversation,
  useChatMessages,
  useMarkConversationSeen,
} from "@/hooks/useChat";
import { useChatWebSocket } from "@/providers/websocket-provider";

interface ChatPanelProps {
  conversationId?: string | null;
  sellerId?: string;
}

function ChatPanelSkeleton() {
  return (
    <div className="flex h-[620px] min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="flex-1 space-y-4 p-5">
        <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-slate-100" />
        <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 w-1/2 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export function ChatPanel({ conversationId, sellerId }: ChatPanelProps) {
  const conversationQuery = useChatConversation(conversationId);
  const messagesQuery = useChatMessages(conversationId);
  const markSeen = useMarkConversationSeen();
  const {
    joinConversation,
    latestMessage,
    markAsSeen,
    typingEvents,
    connectionStatus,
  } = useChatWebSocket();
  const conversation = conversationQuery.data?.conversation;
  const messages = messagesQuery.data?.messages || [];
  const avatarUrl = getConversationAvatarUrl(conversation);
  const lastSeenMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    joinConversation(conversationId);
    markAsSeen(conversationId);
    markSeen.mutate(conversationId);
  }, [conversationId, joinConversation, markAsSeen]);

  useEffect(() => {
    if (
      !conversationId ||
      !latestMessage ||
      latestMessage.conversationId !== conversationId ||
      latestMessage.senderType === "seller"
    ) {
      return;
    }

    const messageKey = latestMessage.id || latestMessage.clientMessageId;
    if (lastSeenMessageRef.current === messageKey) return;

    lastSeenMessageRef.current = messageKey;
    markAsSeen(conversationId);
    markSeen.mutate(conversationId);
  }, [conversationId, latestMessage, markAsSeen]);

  if (!conversationId) {
    return (
      <div className="flex h-[620px] min-h-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-950">
            Select a customer conversation
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Open a conversation from the list to reply.
          </p>
        </div>
      </div>
    );
  }

  if (conversationQuery.isLoading || messagesQuery.isLoading) {
    return <ChatPanelSkeleton />;
  }

  if (conversationQuery.isError || messagesQuery.isError || !conversation) {
    return (
      <div className="flex h-[620px] min-h-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-950">
            Unable to open this conversation
          </h2>
          <button
            type="button"
            onClick={() => {
              void conversationQuery.refetch();
              void messagesQuery.refetch();
            }}
            className="mt-5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex min-w-0 items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={getConversationTitle(conversation)}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-950">
              {getConversationInitials(conversation)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-bold text-slate-950">
                {getConversationTitle(conversation)}
              </h2>
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  conversation.online ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>
            <p className="truncate text-xs text-slate-500">
              {getConversationSubtitle(conversation)}
            </p>
          </div>

          {conversation.product ? (
            <Link
              href={`/dashboard/products/${conversation.product.id}`}
              className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Product
            </Link>
          ) : null}
        </div>

        {conversation.product ? (
          <Link
            href={`/dashboard/products/${conversation.product.id}`}
            className="mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition hover:bg-emerald-50"
          >
            <img
              src={getProductImageUrl(conversation)}
              alt={conversation.product.title}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950">
                {conversation.product.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Package className="h-3.5 w-3.5" />
                Product conversation
              </p>
            </div>
          </Link>
        ) : null}

        {connectionStatus !== "connected" ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Realtime chat is connecting. Replies will send when the connection
            is ready.
          </p>
        ) : null}
      </div>

      <ChatMessageList
        messages={messages}
        currentSellerId={sellerId}
        typingEvent={
          conversationId ? typingEvents[conversationId] || null : null
        }
      />

      <ChatInput
        conversationId={conversation.id}
        disabled={connectionStatus !== "connected"}
      />
    </section>
  );
}
