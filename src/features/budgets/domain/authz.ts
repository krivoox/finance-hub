/**
 * SPEC-07 — Actor rules for budget mutations.
 *
 * - owner / admin / member: can create, update, archive
 * - viewer: read-only (see `assertCanReadBudgets`, currently a no-op)
 */

import { ForbiddenError, type MembershipRole } from "@/features/workspaces/domain";

export function assertCanReadBudgets(role: MembershipRole): void {
  void role;
}

export function assertCanMutateBudgets(role: MembershipRole): void {
  if (role === "viewer") {
    throw new ForbiddenError("Los usuarios viewer no pueden modificar presupuestos");
  }
}
