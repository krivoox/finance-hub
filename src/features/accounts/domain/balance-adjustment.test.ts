import { describe, expect, it } from "vitest";

import { calculateAccountBalance } from "./balance";
import { computeBalanceAdjustment } from "./balance-adjustment";
import {
  InvalidTargetBalanceError,
  NoAdjustmentNeededError,
} from "./errors";

describe("computeBalanceAdjustment — SPEC-22 T-01…T-12", () => {
  describe("asset accounts", () => {
    it("T-01: raising the balance plans adjustment_credit", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 10_000,
          targetBalanceCents: 12_000,
        }),
      ).toEqual({
        amountCents: 2_000,
        ledgerType: "adjustment_credit",
        signedEffect: 2_000,
      });
    });

    it("T-02: lowering the balance plans adjustment_debit", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 10_000,
          targetBalanceCents: 7_000,
        }),
      ).toEqual({
        amountCents: 3_000,
        ledgerType: "adjustment_debit",
        signedEffect: -3_000,
      });
    });

    it("T-03: target 0 plans a debit of the full current balance", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 4_500,
          targetBalanceCents: 0,
        }),
      ).toEqual({
        amountCents: 4_500,
        ledgerType: "adjustment_debit",
        signedEffect: -4_500,
      });
    });

    it("T-04: negative target (overdraft) is allowed on assets", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 1_000,
          targetBalanceCents: -500,
        }),
      ).toEqual({
        amountCents: 1_500,
        ledgerType: "adjustment_debit",
        signedEffect: -1_500,
      });
    });

    it("T-05: climbing out of overdraft plans a credit", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: -200,
          targetBalanceCents: 300,
        }),
      ).toEqual({
        amountCents: 500,
        ledgerType: "adjustment_credit",
        signedEffect: 500,
      });
    });
  });

  describe("credit cards (debt convention)", () => {
    it("T-06: lowering debt plans adjustment_credit", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "credit_card",
          currentBalanceCents: 8_000,
          targetBalanceCents: 5_000,
        }),
      ).toEqual({
        amountCents: 3_000,
        ledgerType: "adjustment_credit",
        signedEffect: -3_000,
      });
    });

    it("T-07: raising debt plans adjustment_debit", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "credit_card",
          currentBalanceCents: 8_000,
          targetBalanceCents: 11_000,
        }),
      ).toEqual({
        amountCents: 3_000,
        ledgerType: "adjustment_debit",
        signedEffect: 3_000,
      });
    });

    it("T-08: target 0 settles the card", () => {
      expect(
        computeBalanceAdjustment({
          accountType: "credit_card",
          currentBalanceCents: 8_000,
          targetBalanceCents: 0,
        }),
      ).toEqual({
        amountCents: 8_000,
        ledgerType: "adjustment_credit",
        signedEffect: -8_000,
      });
    });

    it("T-09: negative debt target is rejected", () => {
      expect(() =>
        computeBalanceAdjustment({
          accountType: "credit_card",
          currentBalanceCents: 1_000,
          targetBalanceCents: -1,
        }),
      ).toThrow(InvalidTargetBalanceError);
    });

    it("T-10: already-zero card with target 0 needs no adjustment", () => {
      expect(() =>
        computeBalanceAdjustment({
          accountType: "credit_card",
          currentBalanceCents: 0,
          targetBalanceCents: 0,
        }),
      ).toThrow(NoAdjustmentNeededError);
    });
  });

  describe("invalid inputs", () => {
    it("T-11: same current and target throws NoAdjustmentNeeded", () => {
      expect(() =>
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 10_000,
          targetBalanceCents: 10_000,
        }),
      ).toThrow(NoAdjustmentNeededError);
    });

    it("T-12: non-safe-integer target or current is InvalidTargetBalance", () => {
      expect(() =>
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 10_000,
          targetBalanceCents: 10.5,
        }),
      ).toThrow(InvalidTargetBalanceError);

      expect(() =>
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 10_000,
          targetBalanceCents: Number.NaN,
        }),
      ).toThrow(InvalidTargetBalanceError);

      expect(() =>
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 10_000,
          targetBalanceCents: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(InvalidTargetBalanceError);

      expect(() =>
        computeBalanceAdjustment({
          accountType: "checking",
          currentBalanceCents: 1.2,
          targetBalanceCents: 0,
        }),
      ).toThrow(InvalidTargetBalanceError);
    });
  });
});

describe("calculateAccountBalance polarity — SPEC-22 T-13…T-15", () => {
  it("T-13: credit raises an asset; debit lowers it", () => {
    const account = {
      id: "acc-checking",
      type: "checking" as const,
      currency: "ARS",
      initialBalanceCents: 10_000,
    };
    expect(
      calculateAccountBalance(account, [
        {
          type: "adjustment_credit",
          amountCents: 2_000,
          accountId: account.id,
        },
      ]).amountCents,
    ).toBe(12_000);
    expect(
      calculateAccountBalance(account, [
        {
          type: "adjustment_debit",
          amountCents: 2_000,
          accountId: account.id,
        },
      ]).amountCents,
    ).toBe(8_000);
  });

  it("T-14: credit lowers card debt; debit raises it", () => {
    const account = {
      id: "acc-credit",
      type: "credit_card" as const,
      currency: "ARS",
      initialBalanceCents: 8_000,
    };
    expect(
      calculateAccountBalance(account, [
        {
          type: "adjustment_credit",
          amountCents: 3_000,
          accountId: account.id,
        },
      ]).amountCents,
    ).toBe(5_000);
    expect(
      calculateAccountBalance(account, [
        {
          type: "adjustment_debit",
          amountCents: 3_000,
          accountId: account.id,
        },
      ]).amountCents,
    ).toBe(11_000);
  });

  it("T-15: applying the plan lands current on the target", () => {
    const account = {
      id: "acc-checking",
      type: "checking" as const,
      currency: "ARS",
      initialBalanceCents: 10_000,
    };
    const current = calculateAccountBalance(account, []).amountCents;
    const plan = computeBalanceAdjustment({
      accountType: account.type,
      currentBalanceCents: current,
      targetBalanceCents: 7_500,
    });
    expect(
      calculateAccountBalance(account, [
        {
          type: plan.ledgerType,
          amountCents: plan.amountCents,
          accountId: account.id,
        },
      ]).amountCents,
    ).toBe(7_500);
  });
});
