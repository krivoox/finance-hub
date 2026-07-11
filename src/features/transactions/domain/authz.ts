/**
 * SPEC-05 §4 / SPEC-06 §4 — Actor rules for transaction mutations.
 *
 * - owner / admin / member: can create, update, delete
 * - viewer: read-only
 */

import { ForbiddenError, type MembershipRole } from "@/features/workspaces/domain";

export function assertCanReadTransactions(role: MembershipRole): void {
  void role;
}

export function assertCanMutateTransactions(role: MembershipRole): void {
  if (role === "viewer") {
    throw new ForbiddenError("Los usuarios viewer no pueden modificar movimientos");
  }
}
