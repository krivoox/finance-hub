import { describe, expect, it } from "vitest";

import { classifyOccurrence } from "./status";

describe("SPEC-18 classification", () => {
  it("T-08 — pending_past", () => {
    expect(
      classifyOccurrence("2026-08-01", "2026-08-05", 30, new Set()),
    ).toBe("pending_past");
  });

  it("T-09 — pending_today", () => {
    expect(
      classifyOccurrence("2026-08-05", "2026-08-05", 30, new Set()),
    ).toBe("pending_today");
  });

  it("T-10 — pending_upcoming", () => {
    expect(
      classifyOccurrence("2026-08-15", "2026-08-05", 30, new Set()),
    ).toBe("pending_upcoming");
  });

  it("T-11 — pending_future", () => {
    expect(
      classifyOccurrence("2026-09-19", "2026-08-05", 30, new Set()),
    ).toBe("pending_future");
  });

  it("T-12 — materialized", () => {
    expect(
      classifyOccurrence(
        "2026-08-02",
        "2026-08-05",
        30,
        new Set(["2026-08-02"]),
      ),
    ).toBe("materialized");
  });
});
