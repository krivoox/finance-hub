import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  assertCanDeleteAccount,
  assertCanMutateAccounts,
  assertDeleteAccountConfirmation,
} from "@/features/accounts/domain";
import {
  reverseContribution,
  type GoalStatus,
} from "@/features/goals/domain";
import { requireAccountMembership } from "./require-account-membership";

/**
 * SPEC-03 FR-08 / §5.4 / §5.5 — Hard-delete an account with explicit cascade
 * inside one DB transaction. Does **not** change Prisma `onDelete: Restrict`.
 */
export async function deleteAccount({
  userId,
  accountId,
  confirmName,
}: {
  userId: string;
  accountId: string;
  confirmName: string;
}): Promise<void> {
  const { account, membership } = await requireAccountMembership(
    userId,
    accountId,
  );
  assertCanMutateAccounts(membership.role);
  assertDeleteAccountConfirmation({
    accountName: account.name,
    confirmName,
  });

  const workspaceId = account.workspaceId;

  const [activeGoalsLinkedToAccount, activeAccountCountInWorkspace] =
    await Promise.all([
      prisma.goal.findMany({
        where: { linkedAccountId: accountId, status: "active" },
        select: { id: true },
      }),
      prisma.financeAccount.count({
        where: { workspaceId, isArchived: false },
      }),
    ]);

  assertCanDeleteAccount({
    accountId,
    isArchived: account.isArchived,
    activeAccountCountInWorkspace,
    activeGoalsLinkedToAccount,
  });

  await prisma.$transaction(async (tx) => {
    await recheckDeleteGuards(tx, {
      accountId,
      workspaceId,
      isArchived: account.isArchived,
    });

    // §5.5 step 2 — nullify linkedAccount on non-active goals
    await tx.goal.updateMany({
      where: {
        linkedAccountId: accountId,
        status: { in: ["completed", "cancelled"] },
      },
      data: { linkedAccountId: null },
    });

    // §5.5 step 3 — detach txs from rules, then hard-delete rules
    const rules = await tx.recurringRule.findMany({
      where: {
        OR: [{ accountId }, { counterpartyAccountId: accountId }],
      },
      select: { id: true },
    });
    const ruleIds = rules.map((r) => r.id);
    if (ruleIds.length > 0) {
      await tx.transaction.updateMany({
        where: { recurringRuleId: { in: ruleIds } },
        data: { recurringRuleId: null, scheduledOn: null },
      });
      await tx.recurringRule.deleteMany({
        where: { id: { in: ruleIds } },
      });
    }

    // §5.5 step 4 — currency exchanges involving this account
    const exchanges = await tx.currencyExchange.findMany({
      where: {
        workspaceId,
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      },
      select: {
        id: true,
        fromTransactionId: true,
        toTransactionId: true,
      },
    });
    for (const exchange of exchanges) {
      await tx.currencyExchange.delete({ where: { id: exchange.id } });
      await tx.transaction.deleteMany({
        where: {
          id: {
            in: [exchange.fromTransactionId, exchange.toTransactionId],
          },
        },
      });
    }

    // §5.5 step 5 — remaining txs on account or as counterparty
    const remaining = await tx.transaction.findMany({
      where: {
        workspaceId,
        OR: [{ accountId }, { counterpartyAccountId: accountId }],
      },
      select: {
        id: true,
        goalContribution: {
          select: {
            id: true,
            amountCents: true,
            goal: {
              select: {
                id: true,
                currentAmountCents: true,
                targetAmountCents: true,
                status: true,
              },
            },
          },
        },
      },
    });

    for (const row of remaining) {
      if (row.goalContribution) {
        const { newCurrentAmountCents, newStatus } = reverseContribution(
          {
            currentAmountCents: row.goalContribution.goal.currentAmountCents,
            targetAmountCents: row.goalContribution.goal.targetAmountCents,
            status: row.goalContribution.goal.status as GoalStatus,
          },
          row.goalContribution.amountCents,
        );
        await tx.goalContribution.delete({
          where: { id: row.goalContribution.id },
        });
        await tx.goal.update({
          where: { id: row.goalContribution.goal.id },
          data: {
            currentAmountCents: newCurrentAmountCents,
            status: newStatus,
          },
        });
      }

      // ExpenseSplit (+ shares) cascade via Transaction.onDelete
      await tx.transaction.delete({ where: { id: row.id } });
    }

    // §5.5 step 6
    await tx.financeAccount.delete({ where: { id: accountId } });
  });
}

async function recheckDeleteGuards(
  tx: Prisma.TransactionClient,
  input: {
    accountId: string;
    workspaceId: string;
    isArchived: boolean;
  },
): Promise<void> {
  const [activeGoalsLinkedToAccount, activeAccountCountInWorkspace] =
    await Promise.all([
      tx.goal.findMany({
        where: { linkedAccountId: input.accountId, status: "active" },
        select: { id: true },
      }),
      tx.financeAccount.count({
        where: { workspaceId: input.workspaceId, isArchived: false },
      }),
    ]);

  assertCanDeleteAccount({
    accountId: input.accountId,
    isArchived: input.isArchived,
    activeAccountCountInWorkspace,
    activeGoalsLinkedToAccount,
  });
}
