import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * SPEC-18 §4.7 — Auto-pause every active rule that uses `accountId` as
 * origin or counterparty. Meant to be called from `archiveAccount` before
 * / around the archive update, ideally inside the same transaction.
 */
export async function autoPauseRulesForAccount(
  db: Prisma.TransactionClient,
  accountId: string,
): Promise<number> {
  const result = await db.recurringRule.updateMany({
    where: {
      status: "active",
      OR: [
        { accountId },
        { counterpartyAccountId: accountId },
      ],
    },
    data: {
      status: "paused",
      pausedReason: "account_archived",
    },
  });
  return result.count;
}
