"use client";

import { MessageCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateOrGetConversation } from "@/hooks/useChat";
import { Product } from "@/types/product";

interface ChatWithSellerButtonProps {
  product: Product;
  label?: string;
  className?: string;
  disabledClassName?: string;
  showIcon?: boolean;
}

const defaultClassName =
  "inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50";

export function ChatWithSellerButton({
  product,
  label = "Chat Now",
  className = defaultClassName,
  disabledClassName,
  showIcon = true,
}: ChatWithSellerButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuth();
  const createConversation = useCreateOrGetConversation();
  const [error, setError] = useState("");
  const shopId = product.shop?.id || product.shopId;
  const isDisabled = !product.id || !shopId || createConversation.isPending;

  const getReturnUrl = () => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const handleClick = async () => {
    setError("");

    if (!product.id || !shopId) {
      setError("Seller chat is unavailable for this product.");
      return;
    }

    if (fetchUser.isLoading) return;

    if (!fetchUser.data) {
      router.push(`/login?redirect=${encodeURIComponent(getReturnUrl())}`);
      return;
    }

    try {
      const response = await createConversation.mutateAsync({
        productId: product.id,
        shopId,
      });

      router.push(
        `/profile?tab=inbox&conversationId=${response.conversation.id}`,
      );
    } catch (conversationError) {
      setError(
        (conversationError as any)?.response?.data?.message ||
          "Unable to start chat right now.",
      );
    }
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-label="Open seller chat"
        onClick={handleClick}
        disabled={isDisabled}
        className={`${className} ${isDisabled && disabledClassName ? disabledClassName : ""}`}
      >
        {showIcon ? <MessageCircle className="h-4 w-4 shrink-0" /> : null}
        <span className="truncate">
          {createConversation.isPending ? "Opening..." : label}
        </span>
      </button>

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
