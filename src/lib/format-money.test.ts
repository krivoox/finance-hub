import { describe, expect, it } from "vitest";

import { formatFittedMoney, formatMoney } from "./format-money";

describe("formatFittedMoney", () => {
  it("keeps the full format when it already fits", () => {
    const cents = 12_500_00;
    const full = formatMoney(cents, "ARS");
    expect(formatFittedMoney(cents, "ARS", { maxChars: 40 })).toBe(full);
  });

  it("uses compact notation when the full string is too long for the hole", () => {
    const cents = 444_741_329;
    const full = formatMoney(cents, "ARS");
    expect(full.length).toBeGreaterThan(14);

    const fitted = formatFittedMoney(cents, "ARS", { maxChars: 14 });
    expect(fitted.length).toBeLessThan(full.length);
    expect(fitted).toMatch(/ARS/);
    expect(fitted).not.toMatch(/4\.447\.413,29/);
  });
});
