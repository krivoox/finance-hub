import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  assertCanMutateAccounts,
  assertAccountCurrencyAllowed,
  assertValidAccountName,
  assertValidCreditLimit,
  assertValidInitialBalance,
  type AccountType,
} from "@/features/accounts/domain";
import type { AccountRecord } from "./require-account-membership";

export type CreateAccountServiceInput = {
  userId: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
  /**
   * Optional. Defaults to `workspace.baseCurrency`.
   * Must be ARS or USD (ADR-006); may differ from baseCurrency.
   */
  currency?: string;
  creditLimitCents?: number | null;
};

/**
 * SPEC-03 FR-01 — Create an account inside the caller's workspace.
 *
 * Domain guards run before hitting Postgres so we can surface friendly errors
 * without touching the database.
 */
export async function createAccount({
  userId,
  workspaceId,
  name,
  type,
  initialBalanceCents,
  currency,
  creditLimitCents,
}: CreateAccountServiceInput): Promise<AccountRecord> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanMutateAccounts(role);

  const trimmedName = name.trim();
  assertValidAccountName(trimmedName);
  assertValidInitialBalance(initialBalanceCents);
  assertValidCreditLimit(type, creditLimitCents ?? null);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { baseCurrency: true },
  });
  if (!workspace) {
    // requireMembership already guaranteed the row exists via the membership FK;
    // this is a defensive fallback for concurrent deletion.
    throw new Error("Workspace not found");
  }

  const accountCurrency = currency ?? workspace.baseCurrency;
  assertAccountCurrencyAllowed(accountCurrency);

  const created = (await prisma.financeAccount.create({
    data: {
      workspaceId,
      name: trimmedName,
      type,
      currency: accountCurrency,
      initialBalanceCents,
      creditLimitCents:
        type === "credit_card" ? (creditLimitCents ?? null) : null,
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      type: true,
      currency: true,
      initialBalanceCents: true,
      creditLimitCents: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
    },
  })) as AccountRecord;

  return created;
}
