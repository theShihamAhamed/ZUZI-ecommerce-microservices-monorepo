"use client";

import { useParams } from "next/navigation";
import { SellerInboxPageView } from "@/components/chat/seller-inbox-page-view";

export default function SellerConversationPage() {
  const params = useParams<{ conversationId: string }>();

  return <SellerInboxPageView conversationId={params.conversationId} />;
}
