import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  categoryNameKey,
  normalizeCategoryName,
} from "./categories";
import { splitLeadingEmoji } from "./split-leading-emoji";

export type CategoryCreateSuggestion = {
  readonly emoji: string | null;
  readonly label: string;
};

/**
 * SPEC-04 T-07 — Offer in-place create when the search does not match an
 * existing category (emoji-insensitive).
 */
export function categoryCreateSuggestion(
  query: string,
  existingNames: readonly string[],
): CategoryCreateSuggestion | null {
  const { emoji, label: rawLabel } = splitLeadingEmoji(query);
  const label = normalizeCategoryName(rawLabel);
  if (label.length < CATEGORY_NAME_MIN_LENGTH) return null;
  if (label.length > CATEGORY_NAME_MAX_LENGTH) return null;

  const key = categoryNameKey(label);
  if (!key) return null;

  const exists = existingNames.some((name) => categoryNameKey(name) === key);
  if (exists) return null;

  return { emoji, label };
}
