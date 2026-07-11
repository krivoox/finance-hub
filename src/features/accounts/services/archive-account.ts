import "server-only";
import { prisma } from "@/lib/prisma";
import { assertCanMutateAccounts } from "@/features/accounts/domain";
import {
  requireAccountMembership,
  type AccountRecord,
} from "./require-account-membership";

/**
 * SPEC-03 FR-05 — Soft-delete an account. Historial (transacciones futuras
 * cuando existan) queda intacto; sólo se marca `isArchived = true`.
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

  const updated = (await prisma.financeAccount.update({
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
  })) as AccountRecord;

  return updated;
}
