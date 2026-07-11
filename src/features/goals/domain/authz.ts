/**
 * SPEC-08 §2 / shared workspace rules — actor rules for goal mutations.
 *
 * - owner / admin / member: can create, contribute, cancel, complete
 * - viewer: read-only
 */

import { ForbiddenError, type MembershipRole } from "@/features/workspaces/domain";

/**
 * Kept for symmetry and future-proofing: every workspace member (including
 * viewers) can currently read goals, so this is a no-op.
 */
export function assertCanReadGoals(role: MembershipRole): void {
  void role;
}

export function assertCanMutateGoals(role: MembershipRole): void {
  if (role === "viewer") {
    throw new ForbiddenError("Los usuarios viewer no pueden modificar objetivos");
  }
}
