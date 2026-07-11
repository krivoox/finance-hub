import { InvalidSettlementError, NotAGroupWorkspaceError } from "./errors";
import type { SplitShare } from "./allocate";

export type SplitForBalance = {
  paidByUserId: string;
  shares: readonly SplitShare[];
};

export type SettlementForBalance = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

/**
 * Net balance for a member.
 * Positive `netCents` = others owe them (they are owed).
 * Negative `netCents` = they owe others.
 *
 * For each split: payer is credited (total − own share); each other participant
 * is debited their share. Settlements: fromUser pays toUser → fromUser net +,
 * toUser net − (debt reduction).
 */
export type MemberBalance = {
  userId: string;
  netCents: number;
};

export function assertGroupWorkspace(type: "personal" | "group"): void {
  if (type !== "group") {
    throw new NotAGroupWorkspaceError();
  }
}

export function assertValidSettlement(input: {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}): void {
  if (input.fromUserId === input.toUserId) {
    throw new InvalidSettlementError("Settlement parties must be different users");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new InvalidSettlementError("Settlement amount must be a positive integer");
  }
}

export function computeMemberBalances(
  splits: readonly SplitForBalance[],
  settlements: readonly SettlementForBalance[],
  memberIds: readonly string[],
): MemberBalance[] {
  const nets = new Map<string, number>();
  for (const id of memberIds) {
    nets.set(id, 0);
  }

  const bump = (userId: string, delta: number) => {
    if (!nets.has(userId)) {
      nets.set(userId, 0);
    }
    nets.set(userId, (nets.get(userId) ?? 0) + delta);
  };

  for (const split of splits) {
    const total = split.shares.reduce((acc, s) => acc + s.shareCents, 0);
    // Payer fronted the full amount → credit total
    bump(split.paidByUserId, total);
    // Each share is what that person owes → debit
    for (const share of split.shares) {
      bump(share.userId, -share.shareCents);
    }
  }

  for (const settlement of settlements) {
    // from pays to → from's debt decreases (net +), to's credit decreases (net −)
    bump(settlement.fromUserId, settlement.amountCents);
    bump(settlement.toUserId, -settlement.amountCents);
  }

  return [...nets.entries()]
    .map(([userId, netCents]) => ({ userId, netCents }))
    .toSorted((a, b) => a.userId.localeCompare(b.userId));
}

export function assertCanMutateSplits(role: string): void {
  if (role === "viewer") {
    throw new InvalidSettlementError("Viewers cannot mutate splits or settlements");
  }
}
