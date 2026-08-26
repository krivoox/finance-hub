import {
  AlreadySplitGroupMemberError,
  CannotRemoveGroupCreatorError,
  DuplicateGhostNameError,
  ForbiddenSplitGroupActionError,
  GhostCannotPayError,
  InvalidGhostNameError,
  InvalidSplitGroupNameError,
  MemberHasSplitHistoryError,
  NotSplitGroupUserMemberError,
} from "./errors";
import { SPLIT_NAME_MAX_LENGTH, type SplitGroupMemberRef } from "./types";

export function normalizeSplitGroupName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0 || name.length > SPLIT_NAME_MAX_LENGTH) {
    throw new InvalidSplitGroupNameError();
  }
  return name;
}

export function normalizeGhostDisplayName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0 || name.length > SPLIT_NAME_MAX_LENGTH) {
    throw new InvalidGhostNameError();
  }
  return name;
}

export function ghostDisplayNameKey(normalized: string): string {
  return normalized.toLowerCase();
}

export function assertGhostNameAvailable(input: {
  existingGhostKeys: readonly string[];
  rawName: string;
}): string {
  const normalized = normalizeGhostDisplayName(input.rawName);
  const key = ghostDisplayNameKey(normalized);
  if (input.existingGhostKeys.includes(key)) {
    throw new DuplicateGhostNameError();
  }
  return normalized;
}

export function assertUserIdAvailableInGroup(input: {
  existingUserIds: readonly string[];
  userId: string;
}): void {
  if (input.existingUserIds.includes(input.userId)) {
    throw new AlreadySplitGroupMemberError();
  }
}

export function assertMemberCanPay(member: SplitGroupMemberRef): void {
  if (member.kind === "ghost" || member.userId === null) {
    throw new GhostCannotPayError();
  }
}

export function assertActorIsUserMember(input: {
  members: readonly SplitGroupMemberRef[];
  userId: string;
}): SplitGroupMemberRef {
  const member = input.members.find(
    (m) => m.kind === "user" && m.userId === input.userId,
  );
  if (!member) {
    throw new NotSplitGroupUserMemberError();
  }
  return member;
}

export function assertCanRenameSplitGroup(input: {
  createdByUserId: string;
  actorUserId: string;
}): void {
  if (input.createdByUserId !== input.actorUserId) {
    throw new ForbiddenSplitGroupActionError(
      "Only the creator can rename this split group",
    );
  }
}

export function assertCanDeleteSplitGroup(input: {
  createdByUserId: string;
  actorUserId: string;
}): void {
  if (input.createdByUserId !== input.actorUserId) {
    throw new ForbiddenSplitGroupActionError(
      "Only the creator can delete this split group",
    );
  }
}

export function memberHasLedgerHistory(input: {
  memberId: string;
  paidSplitMemberIds: readonly string[];
  shareMemberIds: readonly string[];
  settlementMemberIds: readonly string[];
}): boolean {
  return (
    input.paidSplitMemberIds.includes(input.memberId) ||
    input.shareMemberIds.includes(input.memberId) ||
    input.settlementMemberIds.includes(input.memberId)
  );
}

type MemberAbmInput = {
  actorUserId: string;
  createdByUserId: string;
  actorMemberId: string;
  target: SplitGroupMemberRef;
};

function isCreator(input: MemberAbmInput): boolean {
  return input.actorUserId === input.createdByUserId;
}

function isSelf(input: MemberAbmInput): boolean {
  return input.target.memberId === input.actorMemberId;
}

export function canRenameMember(input: MemberAbmInput): boolean {
  return isCreator(input) || isSelf(input) || input.target.kind === "ghost";
}

export function assertCanRenameMember(input: MemberAbmInput): void {
  if (!canRenameMember(input)) {
    throw new ForbiddenSplitGroupActionError(
      "Only the creator can rename another user member",
    );
  }
}

export function canRemoveMember(
  input: MemberAbmInput & { hasLedgerHistory: boolean },
): boolean {
  try {
    assertCanRemoveMember(input);
    return true;
  } catch {
    return false;
  }
}

export function assertCanRemoveMember(
  input: MemberAbmInput & { hasLedgerHistory: boolean },
): void {
  if (input.target.userId === input.createdByUserId) {
    throw new CannotRemoveGroupCreatorError();
  }
  if (input.hasLedgerHistory) {
    throw new MemberHasSplitHistoryError();
  }
  if (isCreator(input) || isSelf(input) || input.target.kind === "ghost") {
    return;
  }
  throw new ForbiddenSplitGroupActionError(
    "Only the creator can remove another user member",
  );
}
