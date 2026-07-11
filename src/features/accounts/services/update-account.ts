import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanMutateAccounts,
  assertValidAccountName,
  assertValidCreditLimit,
} from "@/features/accounts/domain";
import {
  requireAccountMembership,
  type AccountRecord,
} from "./require-account-membership";

export type UpdateAccountServiceInput = {
  userId: string;
  accountId: string;
  name?: string;
  /**
   * `undefined` = leave untouched. `null` = clear the credit limit. A number
   * sets a new limit (only allowed on `credit_card` accounts).
   */
  creditLimitCents?: number | null;
};

/**
 * SPEC-03 FR-04 — Update the account name; on credit cards, also allow
 * changing the credit limit.
 */
export async function updateAccount({
  userId,
  accountId,
  name,
  creditLimitCents,
}: UpdateAccountServiceInput): Promise<AccountRecord> {
  const { account, membership } = await requireAccountMembership(
    userId,
    accountId,
  );
  assertCanMutateAccounts(membership.role);

  const data: {
    name?: string;
    creditLimitCents?: number | null;
  } = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    assertValidAccountName(trimmed);
    data.name = trimmed;
  }

  if (creditLimitCents !== undefined) {
    assertValidCreditLimit(account.type, creditLimitCents);
    data.creditLimitCents = creditLimitCents;
  }

  if (Object.keys(data).length === 0) return account;

  const updated = (await prisma.financeAccount.update({
    where: { id: accountId },
    data,
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
