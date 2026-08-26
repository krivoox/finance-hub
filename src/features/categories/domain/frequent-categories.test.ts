import { describe, expect, it } from "vitest";

import { CONTRIBUTION_CATEGORY_NAMES } from "./categories";
import {
  pinSelectedCategory,
  pickFrequentCategories,
} from "./frequent-categories";

const cats = [
  { id: "a", name: "🍽️ Comida" },
  { id: "b", name: "🚌 Transporte" },
  { id: "c", name: "🏠 Vivienda" },
  { id: "d", name: "💡 Servicios" },
  { id: "e", name: "🎉 Ocio" },
  { id: "f", name: "🏥 Salud" },
] as const;

const seed = cats.map((c) => c.name);

describe("pickFrequentCategories (SPEC-04 T-08)", () => {
  it("orders by usage desc and caps at limit", () => {
    const usage = { a: 10, b: 3, c: 3, d: 0, e: 0, f: 1 };
    const picked = pickFrequentCategories(cats, usage, 5, seed);
    expect(picked.map((c) => c.id)).toEqual(["a", "b", "c", "f", "d"]);
  });

  it("breaks usage ties with seed order", () => {
    const usage = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
    const picked = pickFrequentCategories(cats, usage, 4, seed);
    expect(picked.map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("deprioritizes unused system contribution categories", () => {
    const withSystem = [
      ...cats.slice(0, 3),
      { id: "sys", name: CONTRIBUTION_CATEGORY_NAMES.expense },
      { id: "d", name: "💡 Servicios" },
    ];
    const picked = pickFrequentCategories(withSystem, {}, 4, seed);
    expect(picked.map((c) => c.id)).not.toContain("sys");
  });

  it("still ranks a heavily used system category", () => {
    const withSystem = [
      { id: "sys", name: CONTRIBUTION_CATEGORY_NAMES.expense },
      { id: "a", name: "🍽️ Comida" },
    ];
    const picked = pickFrequentCategories(
      withSystem,
      { sys: 20, a: 1 },
      2,
      seed,
    );
    expect(picked[0]?.id).toBe("sys");
  });
});

describe("pinSelectedCategory", () => {
  it("leaves picks unchanged when selection is already visible", () => {
    const picks = cats.slice(0, 4);
    expect(pinSelectedCategory(picks, cats, "a", 4).map((c) => c.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("replaces the last pick so the selection stays visible", () => {
    const picks = cats.slice(0, 4);
    expect(pinSelectedCategory(picks, cats, "f", 4).map((c) => c.id)).toEqual([
      "a",
      "b",
      "c",
      "f",
    ]);
  });
});
