import { describe, expect, it } from "vitest";
import {
  calculateAccountBalance,
  type AccountForBalance,
  type BalanceEffectTx,
} from "./balance";

const CHECKING: AccountForBalance = {
  id: "acc-checking",
  type: "checking",
  currency: "ARS",
  initialBalanceCents: 0,
};

const CREDIT: AccountForBalance = {
  id: "acc-credit",
  type: "credit_card",
  currency: "ARS",
  initialBalanceCents: 0,
};

describe("calculateAccountBalance — SPEC-03 §5 balance derivation", () => {
  describe("T-01 initial balance", () => {
    it("returns initialBalance when there are no transactions", () => {
      const account = { ...CHECKING, initialBalanceCents: 10_000 };
      expect(calculateAccountBalance(account, [])).toEqual({
        amountCents: 10_000,
        currency: "ARS",
      });
    });

    it("returns zero for a brand-new account with 0 initial balance", () => {
      const balance = calculateAccountBalance(CHECKING, []);
      expect(balance.amountCents).toBe(0);
      expect(balance.currency).toBe("ARS");
    });
  });

  describe("regular accounts (checking / savings / cash / virtual_wallet / other)", () => {
    it("T-03 subtracts an expense from the balance", () => {
      const account = { ...CHECKING, initialBalanceCents: 10_000 };
      const txs: BalanceEffectTx[] = [
        { type: "expense", amountCents: 2_500, accountId: account.id },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(7_500);
    });

    it("adds an income to the balance", () => {
      const account = { ...CHECKING, initialBalanceCents: 1_000 };
      const txs: BalanceEffectTx[] = [
        { type: "income", amountCents: 4_000, accountId: account.id },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(5_000);
    });

    it("a transfer subtracts from the source account", () => {
      const account = { ...CHECKING, initialBalanceCents: 10_000 };
      const txs: BalanceEffectTx[] = [
        {
          type: "transfer",
          amountCents: 3_000,
          accountId: account.id,
          counterpartyAccountId: "acc-other",
        },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(7_000);
    });

    it("a transfer adds to the destination account", () => {
      const destination: AccountForBalance = {
        id: "acc-savings",
        type: "savings",
        currency: "ARS",
        initialBalanceCents: 0,
      };
      const txs: BalanceEffectTx[] = [
        {
          type: "transfer",
          amountCents: 3_000,
          accountId: "acc-other",
          counterpartyAccountId: destination.id,
        },
      ];
      expect(calculateAccountBalance(destination, txs).amountCents).toBe(3_000);
    });

    it("ignores transactions that do not touch the account", () => {
      const account = { ...CHECKING, initialBalanceCents: 5_000 };
      const txs: BalanceEffectTx[] = [
        { type: "expense", amountCents: 999, accountId: "unrelated" },
        {
          type: "transfer",
          amountCents: 999,
          accountId: "acc-other",
          counterpartyAccountId: "acc-different",
        },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(5_000);
    });

    it("allows the derived balance to be negative (overdrawn)", () => {
      const account = { ...CHECKING, initialBalanceCents: 1_000 };
      const txs: BalanceEffectTx[] = [
        { type: "expense", amountCents: 3_000, accountId: account.id },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(-2_000);
    });
  });

  describe("T-05 credit_card balance represents debt (SPEC-03 §5)", () => {
    it("an expense on a credit card increases the debt", () => {
      const txs: BalanceEffectTx[] = [
        { type: "expense", amountCents: 5_000, accountId: CREDIT.id },
      ];
      expect(calculateAccountBalance(CREDIT, txs).amountCents).toBe(5_000);
    });

    it("an income/payment on the card decreases the debt", () => {
      const account = { ...CREDIT, initialBalanceCents: 10_000 };
      const txs: BalanceEffectTx[] = [
        { type: "income", amountCents: 4_000, accountId: account.id },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(6_000);
    });

    it("a transfer into the credit card (payment) reduces the debt", () => {
      const account = { ...CREDIT, initialBalanceCents: 8_000 };
      const txs: BalanceEffectTx[] = [
        {
          type: "transfer",
          amountCents: 3_000,
          accountId: "acc-checking",
          counterpartyAccountId: account.id,
        },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(5_000);
    });

    it("a transfer out of the credit card (cash advance) increases the debt", () => {
      const account = { ...CREDIT, initialBalanceCents: 0 };
      const txs: BalanceEffectTx[] = [
        {
          type: "transfer",
          amountCents: 2_000,
          accountId: account.id,
          counterpartyAccountId: "acc-cash",
        },
      ];
      expect(calculateAccountBalance(account, txs).amountCents).toBe(2_000);
    });
  });
});
