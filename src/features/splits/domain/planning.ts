import { allocateEqual } from "./allocate";
import {
  InvalidSplitInputError,
  SplitCurrencyMismatchError,
  SplitGroupTooSmallError,
  SplitMemberNotInGroupError,
} from "./errors";
import { assertActorIsUserMember, assertMemberCanPay } from "./members";
import type { SplitGroupMemberRef, SplitMethod } from "./types";

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = new Set(a);
  if (left.size !== a.length) return false;
  return b.every((id) => left.has(id));
}

export function assertShareParticipants(input: {
  method: SplitMethod;
  currentMemberIds: readonly string[];
  shareMemberIds: readonly string[];
}): void {
  if (input.shareMemberIds.length === 0) {
    throw new InvalidSplitInputError("At least one participant is required");
  }

  const uniqueShareIds = new Set(input.shareMemberIds);
  if (uniqueShareIds.size !== input.shareMemberIds.length) {
    throw new InvalidSplitInputError("Duplicate memberIds in split participants");
  }

  const current = new Set(input.currentMemberIds);
  for (const id of input.shareMemberIds) {
    if (!current.has(id)) {
      throw new SplitMemberNotInGroupError();
    }
  }

  if (input.method === "equal") {
    if (!sameIdSet(input.currentMemberIds, input.shareMemberIds)) {
      throw new InvalidSplitInputError(
        "Equal splits must include every current member",
      );
    }
  }
}

export function assertCanCreateExpenseSplit(input: {
  group: { currency: string; workspaceId: string };
  currentMembers: readonly SplitGroupMemberRef[];
  registrarUserId: string;
  registrarPersonalWorkspaceId: string;
  expense: {
    type: "income" | "expense" | "transfer";
    amountCents: number;
    currency: string;
    workspaceId: string;
  };
  method: SplitMethod;
  shareMemberIds: readonly string[];
}): { paidByMemberId: string } {
  if (input.expense.type !== "expense") {
    throw new InvalidSplitInputError("Only expenses can be split");
  }
  if (
    !Number.isInteger(input.expense.amountCents) ||
    input.expense.amountCents <= 0
  ) {
    throw new InvalidSplitInputError("Total must be a positive integer (cents)");
  }
  if (input.expense.workspaceId !== input.registrarPersonalWorkspaceId) {
    throw new InvalidSplitInputError(
      "Expense must be recorded in the registrar's personal workspace",
    );
  }
  if (input.expense.currency !== input.group.currency) {
    throw new SplitCurrencyMismatchError();
  }
  if (input.currentMembers.length < 2) {
    throw new SplitGroupTooSmallError();
  }

  const payer = assertActorIsUserMember({
    members: input.currentMembers,
    userId: input.registrarUserId,
  });
  assertMemberCanPay(payer);

  assertShareParticipants({
    method: input.method,
    currentMemberIds: input.currentMembers.map((m) => m.memberId),
    shareMemberIds: input.shareMemberIds,
  });

  return { paidByMemberId: payer.memberId };
}

export { allocateEqual };
