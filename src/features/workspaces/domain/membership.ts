/**
 * Pure workspace membership rules for the personal tenant (SPEC-02, ADR-007).
 *
 * Group workspaces and tenant invitations were removed in KRI-29. A user has
 * one personal workspace; membership still carries a role for authz.
 */

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceType = "personal";

export type MembershipEntry = {
  readonly userId: string;
  readonly role: MembershipRole;
};

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

/**
 * Owners and admins can rename a workspace. Viewers/members cannot mutate
 * (SPEC-02 T-04).
 */
export function assertCanRename(role: MembershipRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new ForbiddenError("Only owner/admin can rename the workspace");
  }
}
