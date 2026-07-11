/**
 * SPEC-03 §2 — Actor rules for account mutations.
 *
 * - owner / admin / member: can create, update, archive, unarchive
 * - viewer: read-only
 */

import { ForbiddenError, type MembershipRole } from "@/features/workspaces/domain";

/**
 * Kept for symmetry and future-proofing: every workspace member (including
 * viewers) can currently read accounts, so this is a no-op. If SPEC-03 evolves
 * to hide certain accounts from viewers, this is the single choke point.
 */
export function assertCanReadAccounts(role: MembershipRole): void {
  void role;
}

export function assertCanMutateAccounts(role: MembershipRole): void {
  if (role === "viewer") {
    throw new ForbiddenError("Viewers cannot modify accounts");
  }
}
