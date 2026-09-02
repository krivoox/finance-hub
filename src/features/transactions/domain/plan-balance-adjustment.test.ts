import { describe, expect, it } from "vitest";

import { AccountArchivedError } from "./errors";
import { planCreateBalanceAdjustment } from "./plan-balance-adjustment";
import { TransactionCurrencyMismatchError } from "./errors";
import { OccurredOnTooFutureError } from "./errors";

const NOW = new Date("2026-07-15T12:00:00Z");
const TODAY = new Date("2026-07-15T00:00:00Z");
const TZ = "America/Argentina/Buenos_Aires";

const ACCOUNT = {
  id: "acc-1",
  type: "checking" as const,
  currency: "ARS",
  isArchived: false,
  workspaceId: "ws-1",
};

describe("planCreateBalanceAdjustment — SPEC-22 T-16…T-19", () => {
  it("T-19: returns a snapshot with null category/counterparty", () => {
    const snapshot = planCreateBalanceAdjustment({
      account: ACCOUNT,
      currentBalanceCents: 10_000,
      targetBalanceCents: 12_000,
      occurredOn: TODAY,
      now: NOW,
      timezone: TZ,
      workspaceId: "ws-1",
      description: "  extracto  ",
    });
    expect(snapshot).toMatchObject({
      type: "adjustment_credit",
      amountCents: 2_000,
      currency: "ARS",
      categoryId: null,
      counterpartyAccountId: null,
      accountId: "acc-1",
      signedEffect: 2_000,
      description: "extracto",
    });
  });

  it("T-16: archived account is rejected", () => {
    expect(() =>
      planCreateBalanceAdjustment({
        account: { ...ACCOUNT, isArchived: true },
        currentBalanceCents: 10_000,
        targetBalanceCents: 12_000,
        occurredOn: TODAY,
        now: NOW,
        timezone: TZ,
        workspaceId: "ws-1",
      }),
    ).toThrow(AccountArchivedError);
  });

  it("T-17: occurredOn too far in the future is rejected", () => {
    expect(() =>
      planCreateBalanceAdjustment({
        account: ACCOUNT,
        currentBalanceCents: 10_000,
        targetBalanceCents: 12_000,
        occurredOn: new Date("2026-07-20T00:00:00Z"),
        now: NOW,
        timezone: TZ,
        workspaceId: "ws-1",
      }),
    ).toThrow(OccurredOnTooFutureError);
  });

  it("T-18: explicit currency must match the account", () => {
    expect(() =>
      planCreateBalanceAdjustment({
        account: ACCOUNT,
        currentBalanceCents: 10_000,
        targetBalanceCents: 12_000,
        occurredOn: TODAY,
        now: NOW,
        timezone: TZ,
        workspaceId: "ws-1",
        currency: "USD",
      }),
    ).toThrow(TransactionCurrencyMismatchError);
  });
});
