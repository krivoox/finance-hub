import "server-only";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/features/workspaces/domain";

export type PaymentAccountOption = {
  id: string;
  name: string;
  currency: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
  role: MembershipRole;
};

export type PaymentAccountGroup = {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
  accounts: PaymentAccountOption[];
};

/**
 * SPEC-14 FR-08 — Accounts the user can debit/credit across their workspaces
 * (excluding viewer-only memberships).
 */
export async function listPaymentAccountsForUser(
  userId: string,
): Promise<PaymentAccountGroup[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      role: { not: "viewer" },
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          type: true,
          financeAccounts: {
            where: { isArchived: false },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              currency: true,
              workspaceId: true,
            },
          },
        },
      },
    },
  });

  const groups: PaymentAccountGroup[] = memberships
    .map((m) => ({
      workspaceId: m.workspace.id,
      workspaceName: m.workspace.name,
      workspaceType: m.workspace.type as "personal" | "group",
      accounts: m.workspace.financeAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        workspaceId: a.workspaceId,
        workspaceName: m.workspace.name,
        workspaceType: m.workspace.type as "personal" | "group",
        role: m.role as MembershipRole,
      })),
    }))
    .filter((g) => g.accounts.length > 0)
    .sort((a, b) => {
      if (a.workspaceType !== b.workspaceType) {
        return a.workspaceType === "personal" ? -1 : 1;
      }
      return a.workspaceName.localeCompare(b.workspaceName);
    });

  return groups;
}
