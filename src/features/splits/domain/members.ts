import {
  AlreadySplitGroupMemberError,
  DuplicateGhostNameError,
  ForbiddenSplitGroupActionError,
  GhostCannotPayError,
  InvalidGhostNameError,
  InvalidSplitGroupNameError,
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
