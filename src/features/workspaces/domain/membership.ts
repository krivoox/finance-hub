/**
 * Pure workspace membership rules (SPEC-02 §5).
 *
 * These helpers are pure and side-effect free. They are consumed by services
 * and Server Actions after Prisma reads and drive TDD for the T-02, T-03, T-04
 * scenarios in the spec.
 */

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

export type MembershipEntry = {
  readonly userId: string;
  readonly role: MembershipRole;
};

// ---------------------------------------------------------------------------
// Errors (typed so services and actions can map them to user-facing messages).
// ---------------------------------------------------------------------------

export class WorkspaceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceDomainError";
  }
}

export class ForbiddenError extends WorkspaceDomainError {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class CannotRemoveLastOwner extends WorkspaceDomainError {
  constructor() {
    super("Cannot remove the last owner of the workspace");
    this.name = "CannotRemoveLastOwner";
  }
}

export class InvalidTransferError extends WorkspaceDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransferError";
  }
}

// ---------------------------------------------------------------------------
// Authorization predicates.
// ---------------------------------------------------------------------------

/**
 * Only owners and admins may add/remove/edit members (SPEC-02 §5).
 */
export function assertCanMutateMembers(role: MembershipRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new ForbiddenError("Only owner/admin can manage members");
  }
}

/**
 * Only the current owner may transfer ownership (SPEC-02 §5).
 */
export function assertCanTransferOwnership(role: MembershipRole): void {
  if (role !== "owner") {
    throw new ForbiddenError("Only owner can transfer ownership");
  }
}

/**
 * Owners and admins can rename a workspace. Viewers/members cannot mutate
 * (SPEC-02 T-04).
 */
export function assertCanRename(role: MembershipRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new ForbiddenError("Only owner/admin can rename the workspace");
  }
}

// ---------------------------------------------------------------------------
// Last-owner invariant (SPEC-02 T-02).
// ---------------------------------------------------------------------------

export function assertNotRemovingLastOwner(
  members: readonly MembershipEntry[],
  userIdToRemove: string,
): void {
  const target = members.find((m) => m.userId === userIdToRemove);
  if (!target) {
    throw new WorkspaceDomainError(
      `User ${userIdToRemove} is not a member of this workspace`,
    );
  }
  if (target.role !== "owner") return;

  const remainingOwners = members.filter(
    (m) => m.role === "owner" && m.userId !== userIdToRemove,
  );
  if (remainingOwners.length === 0) {
    throw new CannotRemoveLastOwner();
  }
}

// ---------------------------------------------------------------------------
// Transfer ownership (SPEC-02 T-03).
// Rule: previous owner is demoted to `admin`; new owner replaces them.
// ---------------------------------------------------------------------------

export function applyTransferOwnership(
  members: readonly MembershipEntry[],
  fromUserId: string,
  toUserId: string,
): MembershipEntry[] {
  if (fromUserId === toUserId) {
    throw new InvalidTransferError("Cannot transfer ownership to self");
  }

  const from = members.find((m) => m.userId === fromUserId);
  if (!from) {
    throw new InvalidTransferError(
      `Current owner ${fromUserId} is not a member`,
    );
  }
  if (from.role !== "owner") {
    throw new InvalidTransferError(
      `User ${fromUserId} is not the current owner`,
    );
  }

  const to = members.find((m) => m.userId === toUserId);
  if (!to) {
    throw new InvalidTransferError(
      `Target ${toUserId} is not a member of this workspace`,
    );
  }

  return members.map((m) => {
    if (m.userId === fromUserId) return { userId: m.userId, role: "admin" };
    if (m.userId === toUserId) return { userId: m.userId, role: "owner" };
    return { userId: m.userId, role: m.role };
  });
}

// ---------------------------------------------------------------------------
// Invitation expiry.
// ---------------------------------------------------------------------------

export type InvitationLike = {
  readonly expiresAt: Date;
};

/**
 * Invitation is expired iff `now >= expiresAt` (inclusive).
 */
export function isInvitationExpired(
  invitation: InvitationLike,
  now: Date,
): boolean {
  return now.getTime() >= invitation.expiresAt.getTime();
}
