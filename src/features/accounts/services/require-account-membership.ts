import "server-only";
import { prisma } from "@/lib/prisma";
import {
  requireMembership,
  type MembershipContext,
} from "@/features/workspaces/services";
import { AccountNotFoundError } from "@/features/accounts/domain";
import type { AccountType } from "@/features/accounts/domain";

export type AccountRecord = {
  id: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalanceCents: number;
  creditLimitCents: number | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Loads an account and verifies the caller's membership in its workspace.
 * Throws `AccountNotFoundError` for unknown ids (does not leak workspace ids).
 */
export async function requireAccountMembership(
  userId: string,
  accountId: string,
): Promise<{ account: AccountRecord; membership: MembershipContext }> {
  const account = (await prisma.financeAccount.findUnique({
    where: { id: accountId },
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
  })) as AccountRecord | null;

  if (!account) {
    throw new AccountNotFoundError(accountId);
  }

  const membership = await requireMembership(userId, account.workspaceId);
  return { account, membership };
}
