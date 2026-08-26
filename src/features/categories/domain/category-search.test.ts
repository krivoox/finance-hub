import { describe, expect, it } from "vitest";

import { categoryCreateSuggestion } from "./category-search";

describe("categoryCreateSuggestion (SPEC-04 T-07)", () => {
  const existing = ["🍽️ Comida", "🚌 Transporte"];

  it("Given an unused name, When searching, Then suggests create", () => {
    expect(categoryCreateSuggestion("Farmacia", existing)).toEqual({
      emoji: null,
      label: "Farmacia",
    });
  });

  it("Given a query with leading emoji, When unused, Then keeps the emoji", () => {
    expect(categoryCreateSuggestion("💊 Farmacia", existing)).toEqual({
      emoji: "💊",
      label: "Farmacia",
    });
  });

  it("Given an existing name (with or without emoji), When searching, Then no suggestion", () => {
    expect(categoryCreateSuggestion("Comida", existing)).toBeNull();
    expect(categoryCreateSuggestion("🍽️ comida", existing)).toBeNull();
    expect(categoryCreateSuggestion("comida", existing)).toBeNull();
  });

  it("Given blank or emoji-only query, When searching, Then no suggestion", () => {
    expect(categoryCreateSuggestion("   ", existing)).toBeNull();
    expect(categoryCreateSuggestion("🎮", existing)).toBeNull();
  });
});
