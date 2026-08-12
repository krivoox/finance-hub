import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanArchiveAccount,
  assertCanMutateAccounts,
} from "@/features/accounts/domain";
import { autoPauseRulesForAccount } from "@/features/recurring/services";
import {
  requireAccountMembership,
  type AccountRecord,
} from "./require-account-membership";

/**
 * SPEC-03 FR-05 / FR-09 / SPEC-18 §4.7 — Soft-delete an account.
 * Guard active linked goals **before** auto-pausing recurring rules.
 */
export async function archiveAccount({
  userId,
  accountId,
}: {
  userId: string;
  accountId: string;
}): Promise<AccountRecord> {
  const { account, membership } = await requireAccountMembership(
    userId,
    accountId,
  );
  assertCanMutateAccounts(membership.role);

  if (account.isArchived) return account;

  const activeGoalsLinkedToAccount = await prisma.goal.findMany({
    where: {
      linkedAccountId: accountId,
      status: "active",
    },
    select: { id: true },
  });
  assertCanArchiveAccount({
    accountId,
    activeGoalsLinkedToAccount,
  });

  const updated = await prisma.$transaction(async (tx) => {
    await autoPauseRulesForAccount(tx, accountId);
    return tx.financeAccount.update({
      where: { id: accountId },
      data: { isArchived: true },
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
    });
  });

  return updated as AccountRecord;
}
