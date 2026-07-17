/**
 * Pure workspace setup / onboarding rules (SPEC-15).
 */

import type { MembershipRole } from "./membership";
import { ForbiddenError, WorkspaceDomainError } from "./membership";

export class WorkspaceNotReady extends WorkspaceDomainError {
  constructor(message = "Workspace needs at least one account before setup can complete") {
    super(message);
    this.name = "WorkspaceNotReady";
  }
}

export class SetupDismissNotAllowed extends WorkspaceDomainError {
  constructor(
    message = "Setup can only be dismissed when the workspace has no accounts",
  ) {
    super(message);
    this.name = "SetupDismissNotAllowed";
  }
}

/**
 * SPEC-15 — A workspace is ready to use iff it has ≥1 non-archived account.
 */
export function isWorkspaceReadyToUse(input: {
  accountCount: number;
}): boolean {
  return input.accountCount >= 1;
}

/**
 * Owner/admin may manage onboarding setup (SPEC-15 §5 Authz).
 */
export function assertCanManageSetup(role: MembershipRole): void {
  if (role !== "owner" && role !== "admin") {
    throw new ForbiddenError("Only owner/admin can manage workspace setup");
  }
}

/**
 * Whether the caller should be forced into the onboarding flow.
 */
export function shouldRedirectToOnboarding(input: {
  role: MembershipRole;
  accountCount: number;
  dismissedSetup: boolean;
}): boolean {
  if (input.role !== "owner" && input.role !== "admin") return false;
  if (input.dismissedSetup) return false;
  return !isWorkspaceReadyToUse({ accountCount: input.accountCount });
}

export function assertReadyToComplete(accountCount: number): void {
  if (!isWorkspaceReadyToUse({ accountCount })) {
    throw new WorkspaceNotReady();
  }
}

export function assertCanDismissSetup(accountCount: number): void {
  if (accountCount > 0) {
    throw new SetupDismissNotAllowed();
  }
}
