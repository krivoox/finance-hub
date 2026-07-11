import "server-only";
import {
  assertCanReadAccounts,
  calculateAccountBalance,
} from "@/features/accounts/domain";
import { requireAccountMembership } from "./require-account-membership";
import type { AccountWithBalance } from "./list-accounts";
import { loadAccountBalanceEffects } from "@/features/transactions/services";

/**
 * SPEC-03 — Fetch a single account with its derived `currentBalance` computed
 * from every transaction that touches it (as origin or destination).
 */
export async function getAccount({
  userId,
  accountId,
}: {
  userId: string;
  accountId: string;
}): Promise<AccountWithBalance> {
  const { account, membership } = await requireAccountMembership(
    userId,
    accountId,
  );
  assertCanReadAccounts(membership.role);

  const effects = await loadAccountBalanceEffects(account.id);
  const currentBalance = calculateAccountBalance(
    {
      id: account.id,
      type: account.type,
      currency: account.currency,
      initialBalanceCents: account.initialBalanceCents,
    },
    effects,
  );

  return {
    id: account.id,
    workspaceId: account.workspaceId,
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalanceCents: account.initialBalanceCents,
    creditLimitCents: account.creditLimitCents,
    isArchived: account.isArchived,
    currentBalance,
  };
}
