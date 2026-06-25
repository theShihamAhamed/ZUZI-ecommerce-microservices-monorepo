"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀",
  "😊",
  "😍",
  "👍",
  "🙏",
  "🔥",
  "🎉",
  "❤️",
  "👌",
  "✨",
  "😄",
  "🙂",
  "🤝",
  "💯",
  "✅",
  "🙌",
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label="Add emoji"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
      >
        <Smile className="h-5 w-5" />
      </button>

      {isOpen ? (
        <div className="absolute bottom-12 left-0 z-30 grid w-56 grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              className="flex h-10 items-center justify-center rounded-xl text-lg transition hover:bg-emerald-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
