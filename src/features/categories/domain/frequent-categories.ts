import { categoryNameKey, CONTRIBUTION_CATEGORY_NAMES } from "./categories";

export const CATEGORY_QUICK_PICK_MIN = 4;
export const CATEGORY_QUICK_PICK_MAX = 5;

export type FrequentCategoryCandidate = {
  readonly id: string;
  readonly name: string;
};

const SYSTEM_NAME_KEYS = new Set(
  Object.values(CONTRIBUTION_CATEGORY_NAMES).map((name) =>
    categoryNameKey(name),
  ),
);

function seedIndex(name: string, seedKeys: readonly string[]): number {
  const key = categoryNameKey(name);
  const index = seedKeys.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/**
 * SPEC-04 T-08 — Rank categories for the quick-pick row.
 * Usage desc, then seed order, then name. Unused system categories are last.
 */
export function pickFrequentCategories(
  categories: readonly FrequentCategoryCandidate[],
  usageById: Readonly<Record<string, number>>,
  limit: number,
  seedNames: readonly string[] = [],
): FrequentCategoryCandidate[] {
  const cap = Math.max(0, Math.min(limit, categories.length));
  if (cap === 0) return [];

  const seedKeys = seedNames.map((name) => categoryNameKey(name));

  const ranked = [...categories].sort((a, b) => {
    const usageA = usageById[a.id] ?? 0;
    const usageB = usageById[b.id] ?? 0;
    if (usageA !== usageB) return usageB - usageA;

    const unusedSystemA =
      usageA === 0 && SYSTEM_NAME_KEYS.has(categoryNameKey(a.name)) ? 1 : 0;
    const unusedSystemB =
      usageB === 0 && SYSTEM_NAME_KEYS.has(categoryNameKey(b.name)) ? 1 : 0;
    if (unusedSystemA !== unusedSystemB) return unusedSystemA - unusedSystemB;

    const seedA = seedIndex(a.name, seedKeys);
    const seedB = seedIndex(b.name, seedKeys);
    if (seedA !== seedB) return seedA - seedB;

    return a.name.localeCompare(b.name, "es");
  });

  return ranked.slice(0, cap);
}

/**
 * Keep the current selection visible in the quick row without growing past `limit`.
 */
export function pinSelectedCategory(
  picks: readonly FrequentCategoryCandidate[],
  categories: readonly FrequentCategoryCandidate[],
  selectedId: string | null,
  limit: number,
): FrequentCategoryCandidate[] {
  if (!selectedId) return [...picks];
  if (picks.some((c) => c.id === selectedId)) return [...picks];

  const selected = categories.find((c) => c.id === selectedId);
  if (!selected) return [...picks];

  const cap = Math.max(1, limit);
  if (picks.length < cap) return [...picks, selected];
  return [...picks.slice(0, cap - 1), selected];
}
