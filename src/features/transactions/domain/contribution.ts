/**
 * SPEC-14 — Cross-workspace contribution domain (pure invariants).
 */

import {
  AccountArchivedError,
  SameAccountTransferError,
  TransactionCurrencyMismatchError,
  TransactionDomainError,
} from "./errors";
import { assertCanMutateTransactions } from "./authz";
import type { MembershipRole } from "@/features/workspaces/domain";

export class SameWorkspaceContributionError extends TransactionDomainError {
  constructor() {
    super(
      "El aporte debe ser entre workspaces distintos; usá una transferencia interna",
    );
    this.name = "SameWorkspaceContributionError";
  }
}

export type ContributionAccountLike = {
  id: string;
  workspaceId: string;
  currency: string;
  isArchived: boolean;
};

export type ContributionMembershipLike = {
  workspaceId: string;
  role: MembershipRole;
};

/**
 * Validates that the caller can create a contribution from source → target.
 */
export function assertCanContribute(input: {
  source: ContributionAccountLike;
  target: ContributionAccountLike;
  sourceMembership: ContributionMembershipLike | null;
  targetMembership: ContributionMembershipLike | null;
}): void {
  if (!input.sourceMembership || !input.targetMembership) {
    throw new TransactionDomainError(
      "Debés ser miembro de ambos workspaces para aportar",
    );
  }
  assertCanMutateTransactions(input.sourceMembership.role);
  assertCanMutateTransactions(input.targetMembership.role);

  if (input.source.workspaceId === input.target.workspaceId) {
    throw new SameWorkspaceContributionError();
  }
  if (input.source.id === input.target.id) {
    throw new SameAccountTransferError();
  }
  if (input.source.isArchived || input.target.isArchived) {
    throw new AccountArchivedError();
  }
  if (input.source.currency !== input.target.currency) {
    throw new TransactionCurrencyMismatchError(
      input.source.currency,
      input.target.currency,
    );
  }
}
