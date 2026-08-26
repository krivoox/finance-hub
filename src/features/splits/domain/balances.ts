import { InvalidSettlementError } from "./errors";
import { SplitMemberNotInGroupError } from "./errors";
import type {
  MemberBalance,
  SettlementForBalance,
  SplitForBalance,
} from "./types";

/**
 * Net balance for a member.
 * Positive `netCents` = others owe them (they are owed).
 * Negative `netCents` = they owe others.
 *
 * For each split: payer is credited (total − own share); each other participant
 * is debited their share. Settlements: fromMember pays toMember → from net +,
 * to net − (debt reduction).
 */
export function assertValidSettlement(input: {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  currentMemberIds: readonly string[];
}): void {
  if (input.fromMemberId === input.toMemberId) {
    throw new InvalidSettlementError("Settlement parties must be different members");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new InvalidSettlementError("Settlement amount must be a positive integer");
  }
  const current = new Set(input.currentMemberIds);
  if (!current.has(input.fromMemberId) || !current.has(input.toMemberId)) {
    throw new SplitMemberNotInGroupError();
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

  const bump = (memberId: string, delta: number) => {
    if (!nets.has(memberId)) {
      nets.set(memberId, 0);
    }
    nets.set(memberId, (nets.get(memberId) ?? 0) + delta);
  };

  for (const split of splits) {
    const total = split.shares.reduce((acc, s) => acc + s.shareCents, 0);
    bump(split.paidByMemberId, total);
    for (const share of split.shares) {
      bump(share.memberId, -share.shareCents);
    }
  }

  for (const settlement of settlements) {
    bump(settlement.fromMemberId, settlement.amountCents);
    bump(settlement.toMemberId, -settlement.amountCents);
  }

  return [...nets.entries()]
    .map(([memberId, netCents]) => ({ memberId, netCents }))
    .toSorted((a, b) => a.memberId.localeCompare(b.memberId));
}
