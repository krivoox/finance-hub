/**
 * Split a leading emoji (incl. ZWJ sequences) from a category name.
 * Seeded names look like "🍽️ Comida".
 */
export function splitLeadingEmoji(name: string): {
  emoji: string | null;
  label: string;
} {
  const trimmed = name.trim();
  const match = trimmed.match(
    /^(\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)\s+(.*)$/u,
  );
  if (!match?.[1] || !match[2]) {
    return { emoji: null, label: trimmed };
  }
  return { emoji: match[1], label: match[2] };
}
