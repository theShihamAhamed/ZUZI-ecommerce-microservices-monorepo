"use client";

import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ConversationList } from "@/components/chat/conversation-list";
import { useSellerSession } from "@/hooks/useAuth";
import { useChatConversations } from "@/hooks/useChat";

interface SellerInboxPageViewProps {
  conversationId?: string | null;
}

export function SellerInboxPageView({
  conversationId,
}: SellerInboxPageViewProps) {
  const router = useRouter();
  const { seller, isLoading: isSessionLoading } = useSellerSession();
  const conversationsQuery = useChatConversations(Boolean(seller));
  const conversations = conversationsQuery.data?.conversations || [];

  const handleSelectConversation = (nextConversationId: string) => {
    router.push(`/dashboard/inbox/${nextConversationId}`);
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen min-w-0 max-w-full p-4 text-slate-900 sm:p-6">
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading seller inbox
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen min-w-0 max-w-full p-4 text-slate-900 sm:p-6">
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <div>
            <MessageCircle className="mx-auto h-8 w-8 text-red-600" />
            <h1 className="mt-3 text-lg font-semibold text-slate-950">
              Sign in to view inbox
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Your customer conversations are available after seller login.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Dashboard / Inbox
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-slate-950">
            Inbox
          </h1>
          <p className="mt-1 max-w-3xl break-words text-sm text-slate-500">
            Reply to customer product questions and order-adjacent messages.
          </p>
        </div>
        {conversationsQuery.isFetching && !conversationsQuery.isLoading ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating
          </span>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-bold text-slate-950">Conversations</p>
          </div>
          <ConversationList
            conversations={conversations}
            selectedConversationId={conversationId}
            isLoading={conversationsQuery.isLoading}
            isError={conversationsQuery.isError}
            onRetry={() => conversationsQuery.refetch()}
            onSelect={handleSelectConversation}
          />
        </aside>

        <ChatPanel conversationId={conversationId} sellerId={seller.id} />
      </div>
    </div>
  );
}
