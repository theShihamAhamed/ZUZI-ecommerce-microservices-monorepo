"use client";

import { MessageCircle, Store } from "lucide-react";
import { ChatConversation } from "@/types/chat";
import {
  formatChatTime,
  getConversationAvatarUrl,
  getConversationInitials,
  getConversationSubtitle,
  getConversationTitle,
  getLastMessagePreview,
} from "@/components/chat/chat-ui.helpers";

interface ConversationListProps {
  conversations: ChatConversation[];
  selectedConversationId?: string | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelect: (conversationId: string) => void;
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-2xl p-3"
        >
          <div className="h-12 w-12 rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-28 rounded-full bg-slate-200" />
            <div className="h-3 w-44 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedConversationId,
  isLoading,
  isError,
  onRetry,
  onSelect,
}: ConversationListProps) {
  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-950">
          Unable to load conversations
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Store className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-950">
          Customer messages will appear here.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Conversations start when customers message you from product pages.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {conversations.map((conversation) => {
        const isActive = selectedConversationId === conversation.id;
        const avatarUrl = getConversationAvatarUrl(conversation);
        const unreadCount = conversation.unreadCount || 0;

        return (
          <button
            type="button"
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition ${
              isActive
                ? "bg-emerald-50"
                : "bg-white hover:bg-slate-50 focus:bg-slate-50"
            }`}
          >
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={getConversationTitle(conversation)}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-950">
                  {getConversationInitials(conversation)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                  conversation.online ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-slate-950">
                  {getConversationTitle(conversation)}
                </p>
                <span className="shrink-0 text-[11px] font-medium text-slate-400">
                  {formatChatTime(
                    conversation.lastMessageAt || conversation.updatedAt,
                  )}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                {getConversationSubtitle(conversation)}
              </p>
              <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
                <p className="truncate text-xs text-slate-500">
                  {getLastMessagePreview(conversation)}
                </p>
                {unreadCount > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
