"use client";

import { cn } from "@/lib/utils";

export const SUGGESTED_CATEGORY_EMOJIS = [
  "🍽️",
  "🛒",
  "☕",
  "🍕",
  "🚌",
  "🚗",
  "🏠",
  "💡",
  "🎉",
  "🎬",
  "🏥",
  "💊",
  "📚",
  "👕",
  "🐾",
  "⛽",
  "✈️",
  "🎁",
  "🏋️",
  "🎵",
  "📦",
  "💰",
  "💼",
  "📈",
  "🎮",
  "💻",
  "📺",
  "🤖",
  "☁️",
  "👶",
] as const;

export const DEFAULT_CREATE_EMOJI = {
  expense: "📦",
  income: "💰",
} as const;

type CategoryEmojiGridProps = {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
};

export function CategoryEmojiGrid({
  value,
  onChange,
  className,
}: CategoryEmojiGridProps) {
  return (
    <div
      role="listbox"
      aria-label="Elegir emoji"
      className={cn(
        "grid grid-cols-6 gap-1 rounded-lg bg-muted/50 p-1.5 sm:grid-cols-8",
        className,
      )}
    >
      {SUGGESTED_CATEGORY_EMOJIS.map((emoji) => {
        const selected = emoji === value;
        return (
          <button
            key={emoji}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={`Emoji ${emoji}`}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-base transition-colors",
              "hover:bg-card focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected && "bg-card ring-2 ring-ring/40",
            )}
            onClick={() => onChange(emoji)}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
