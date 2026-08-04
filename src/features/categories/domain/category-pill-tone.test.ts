import { describe, expect, it } from "vitest";

import {
  CATEGORY_PILL_TONES,
  categoryPillTone,
} from "./category-pill-tone";

describe("categoryPillTone", () => {
  it("is stable for the same seed", () => {
    expect(categoryPillTone("cat_comida")).toBe(categoryPillTone("cat_comida"));
  });

  it("returns a chart tone from the palette", () => {
    expect(CATEGORY_PILL_TONES).toContain(categoryPillTone("any-id"));
  });

  it("uses all palette slots across distinct seeds", () => {
    const used = new Set(
      Array.from({ length: 40 }, (_, i) => categoryPillTone(`seed-${i}`)),
    );
    expect(used.size).toBe(CATEGORY_PILL_TONES.length);
  });
});
