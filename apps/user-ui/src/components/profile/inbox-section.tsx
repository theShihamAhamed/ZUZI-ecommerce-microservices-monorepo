"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChatConversations } from "@/hooks/useChat";
import { CustomerProfile } from "@/types/profile";

interface InboxSectionProps {
  profile: CustomerProfile;
}

export function InboxSection({ profile }: InboxSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get("conversationId");
  const conversationsQuery = useChatConversations();
  const conversations = conversationsQuery.data?.conversations || [];

  const handleSelectConversation = (conversationId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", "inbox");
    nextParams.set("conversationId", conversationId);
    router.push(`/profile?${nextParams.toString()}`);
  };

  return (
    <div className="min-w-0">
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-gray-900">Inbox</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your seller conversations and product questions.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">Conversations</p>
          </div>
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            isLoading={conversationsQuery.isLoading}
            isError={conversationsQuery.isError}
            onRetry={() => conversationsQuery.refetch()}
            onSelect={handleSelectConversation}
          />
        </aside>

        <ChatPanel conversationId={selectedConversationId} profile={profile} />
      </div>
    </div>
  );
}
