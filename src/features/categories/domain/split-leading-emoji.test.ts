import { describe, expect, it } from "vitest";

import { splitLeadingEmoji } from "./split-leading-emoji";

describe("splitLeadingEmoji", () => {
  it("Given a seeded category name, When split, Then emoji and label separate", () => {
    expect(splitLeadingEmoji("🍽️ Comida")).toEqual({
      emoji: "🍽️",
      label: "Comida",
    });
  });

  it("Given a ZWJ sequence, When split, Then keeps the full glyph", () => {
    expect(splitLeadingEmoji("👨‍👩‍👧 Familia")).toEqual({
      emoji: "👨‍👩‍👧",
      label: "Familia",
    });
  });

  it("Given a name without emoji, When split, Then emoji is null", () => {
    expect(splitLeadingEmoji("Sin categoría")).toEqual({
      emoji: null,
      label: "Sin categoría",
    });
  });

  it("Given only an emoji, When split, Then label stays the trimmed name", () => {
    expect(splitLeadingEmoji("🎮")).toEqual({
      emoji: null,
      label: "🎮",
    });
  });
});
