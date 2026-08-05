import { describe, expect, it } from "vitest";

import {
  applyAutoPause,
  assertCanPause,
  canResume,
  shouldAutoPauseOnAccountArchive,
} from "./lifecycle";
import {
  RecurringRuleEndedError,
  RecurringRuleNotPausedError,
} from "./errors";

describe("SPEC-18 lifecycle", () => {
  it("T-26 — shouldAutoPauseOnAccountArchive", () => {
    expect(
      shouldAutoPauseOnAccountArchive(
        {
          status: "active",
          accountId: "acc-x",
          counterpartyAccountId: null,
        },
        "acc-x",
      ),
    ).toBe(true);
    expect(
      shouldAutoPauseOnAccountArchive(
        {
          status: "active",
          accountId: "acc-a",
          counterpartyAccountId: "acc-x",
        },
        "acc-x",
      ),
    ).toBe(true);
    expect(
      shouldAutoPauseOnAccountArchive(
        {
          status: "paused",
          accountId: "acc-x",
          counterpartyAccountId: null,
        },
        "acc-x",
      ),
    ).toBe(false);
  });

  it("applyAutoPause sets pausedReason", () => {
    const next = applyAutoPause({
      status: "active" as const,
      pausedReason: null,
    });
    expect(next.status).toBe("paused");
    expect(next.pausedReason).toBe("account_archived");
  });

  it("canResume fails if ended", () => {
    expect(() =>
      canResume({ status: "ended", endDate: null }, "2026-08-05"),
    ).toThrow(RecurringRuleEndedError);
  });

  it("canResume fails if not paused", () => {
    expect(() =>
      canResume({ status: "active", endDate: null }, "2026-08-05"),
    ).toThrow(RecurringRuleNotPausedError);
  });

  it("canResume fails if endDate passed", () => {
    expect(() =>
      canResume(
        { status: "paused", endDate: "2026-07-01" },
        "2026-08-05",
      ),
    ).toThrow(RecurringRuleEndedError);
  });

  it("assertCanPause", () => {
    expect(() => assertCanPause({ status: "active" })).not.toThrow();
    expect(() => assertCanPause({ status: "ended" })).toThrow(
      RecurringRuleEndedError,
    );
  });
});
