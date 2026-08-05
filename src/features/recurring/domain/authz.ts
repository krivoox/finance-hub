/**
 * SPEC-18 §4.9 — Actor rules for recurring mutations.
 */

import { ForbiddenError, type MembershipRole } from "@/features/workspaces/domain";

export function assertCanReadRecurring(role: MembershipRole): void {
  void role;
}

export function assertCanMutateRecurring(role: MembershipRole): void {
  if (role === "viewer") {
    throw new ForbiddenError(
      "Los usuarios viewer no pueden modificar recurrentes",
    );
  }
}
