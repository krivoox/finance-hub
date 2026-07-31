/**
 * Stable chart tone for category pills in lists (no ABM color field).
 * Hash of a seed (prefer categoryId) → chart-1…chart-5. Never expense red.
 */

export const CATEGORY_PILL_TONES = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

export type CategoryPillTone = (typeof CATEGORY_PILL_TONES)[number];

/** Deterministic palette slot from an opaque seed (category id preferred). */
export function categoryPillTone(seed: string): CategoryPillTone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_PILL_TONES[hash % CATEGORY_PILL_TONES.length]!;
}
