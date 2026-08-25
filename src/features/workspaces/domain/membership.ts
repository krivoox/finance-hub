/**
 * Pure workspace membership rules for the personal tenant (SPEC-02, ADR-007).
 *
 * Group workspaces and tenant invitations were removed in KRI-29. A user has
 * one personal workspace; membership still carries a role for authz.
 */

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceType = "personal";

/** A membership the user already has — used to pick the single implicit ledger. */
export type LedgerMembershipCandidate = {
  readonly workspaceId: string;
  readonly type: string;
  readonly joinedAt: Date;
  readonly cookieHit: boolean;
};

/**
 * Product never exposes tenant switching. Map any leftover DB type to the
 * single personal ledger the UI understands.
 */
export function toProductWorkspaceType(_type: string): WorkspaceType {
  return "personal";
}

/**
 * Picks the one ledger the session uses (KRI-29: no multi-tenant switcher).
 *
 * 1. Cookie hit that still has a membership (so existing data stays in view).
 * 2. A `personal` workspace, oldest membership first.
 * 3. Any leftover membership (`group` tenants included).
 */
export function pickDefaultLedgerWorkspace(
  candidates: readonly LedgerMembershipCandidate[],
): string | null {
  if (candidates.length === 0) return null;

  const cookieHit = candidates.find((c) => c.cookieHit);
  if (cookieHit) return cookieHit.workspaceId;

  const personal = candidates
    .filter((c) => c.type === "personal")
    .toSorted((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  if (personal[0]) return personal[0].workspaceId;

  const leftover = candidates.toSorted(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  return leftover[0]?.workspaceId ?? null;
}

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
