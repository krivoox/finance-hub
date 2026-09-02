/**
 * SPEC-22 — Pure snapshot for CreateBalanceAdjustment (no I/O).
 */

import {
  computeBalanceAdjustment,
  type AccountType,
  type AdjustmentLedgerType,
} from "@/features/accounts/domain";
import {
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertOccurredOnNotTooFuture,
  assertTransactionCurrencyMatchesAccount,
  normalizeDescription,
} from "./guards";

export type PlanCreateBalanceAdjustmentInput = {
  readonly account: {
    readonly id: string;
    readonly type: AccountType;
    readonly currency: string;
    readonly isArchived: boolean;
    readonly workspaceId: string;
  };
  readonly currentBalanceCents: number;
  readonly targetBalanceCents: number;
  readonly occurredOn: Date;
  readonly now: Date;
  readonly timezone: string;
  readonly description?: string | null;
  readonly currency?: string;
  readonly workspaceId: string;
};

export type CreateBalanceAdjustmentResult = {
  readonly type: AdjustmentLedgerType;
  readonly amountCents: number;
  readonly currency: string;
  readonly categoryId: null;
  readonly counterpartyAccountId: null;
  readonly accountId: string;
  readonly signedEffect: number;
  readonly description: string | null;
  readonly occurredOn: Date;
};

export function planCreateBalanceAdjustment(
  input: PlanCreateBalanceAdjustmentInput,
): CreateBalanceAdjustmentResult {
  assertAccountBelongsToWorkspace(
    input.account.workspaceId,
    input.workspaceId,
  );
  assertAccountActive(input.account.isArchived);
  assertTransactionCurrencyMatchesAccount(
    input.currency ?? input.account.currency,
    input.account.currency,
  );
  assertOccurredOnNotTooFuture(input.occurredOn, input.now, input.timezone);

  const plan = computeBalanceAdjustment({
    accountType: input.account.type,
    currentBalanceCents: input.currentBalanceCents,
    targetBalanceCents: input.targetBalanceCents,
  });

  return {
    type: plan.ledgerType,
    amountCents: plan.amountCents,
    currency: input.account.currency,
    categoryId: null,
    counterpartyAccountId: null,
    accountId: input.account.id,
    signedEffect: plan.signedEffect,
    description: normalizeDescription(input.description ?? null),
    occurredOn: input.occurredOn,
  };
}
