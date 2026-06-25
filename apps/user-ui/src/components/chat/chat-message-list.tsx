"use client";

import { useEffect, useRef } from "react";
import { Check, CheckCheck, CircleAlert, Clock } from "lucide-react";
import { ChatMessage, TypingEvent } from "@/types/chat";
import { formatChatTime } from "@/components/chat/chat-ui.helpers";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  typingEvent?: TypingEvent | null;
}

const getStatusLabel = (message: ChatMessage) => {
  if (message.localStatus === "failed") return "Failed";
  if (message.localStatus === "sending") return "Sending";
  if (message.status === "Seen") return "Seen";
  if (message.localStatus === "persisted") return "Sent";
  return "Sent";
};

const StatusIcon = ({ message }: { message: ChatMessage }) => {
  if (message.localStatus === "failed") {
    return <CircleAlert className="h-3.5 w-3.5" />;
  }

  if (message.localStatus === "sending") {
    return <Clock className="h-3.5 w-3.5" />;
  }

  if (message.status === "Seen") {
    return <CheckCheck className="h-3.5 w-3.5" />;
  }

  return <Check className="h-3.5 w-3.5" />;
};

export function ChatMessageList({
  messages,
  currentUserId,
  typingEvent,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typingEvent?.participantId]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Start the conversation
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Ask about sizing, availability, delivery, or product details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwnMessage =
            message.senderType === "user" &&
            (!currentUserId || message.senderId === currentUserId);

          return (
            <div
              key={message.id || message.clientMessageId}
              className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[86%] sm:max-w-[72%] ${
                  isOwnMessage ? "items-end" : "items-start"
                } flex flex-col`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwnMessage
                      ? "rounded-br-md bg-black text-white"
                      : "rounded-bl-md border border-stone-200 bg-white text-gray-900"
                  }`}
                >
                  {message.content ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.content}
                    </p>
                  ) : null}

                  {message.attachments?.length ? (
                    <div className={message.content ? "mt-3" : ""}>
                      {message.attachments.map((attachment) => (
                        <a
                          key={attachment.url}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name || "Chat attachment"}
                            className="max-h-72 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div
                  className={`mt-1 flex items-center gap-1 text-[11px] ${
                    isOwnMessage ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  <span>{formatChatTime(message.createdAt)}</span>
                  {isOwnMessage ? (
                    <>
                      <span aria-hidden="true">-</span>
                      <StatusIcon message={message} />
                      <span>{getStatusLabel(message)}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {typingEvent?.participantType === "seller" ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
              Seller is typing...
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
