export class SplitDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitDomainError";
  }
}

export class SplitSumMismatchError extends SplitDomainError {
  constructor() {
    super("Share amounts must sum to the expense total");
    this.name = "SplitSumMismatchError";
  }
}

export class InvalidPercentageError extends SplitDomainError {
  constructor() {
    super("Percentages must sum to 100");
    this.name = "InvalidPercentageError";
  }
}

export class InvalidSettlementError extends SplitDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSettlementError";
  }
}

export class InvalidSplitInputError extends SplitDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSplitInputError";
  }
}

export class InvalidSplitGroupNameError extends SplitDomainError {
  constructor() {
    super("Split group name must be between 1 and 80 characters after trim");
    this.name = "InvalidSplitGroupNameError";
  }
}

export class InvalidGhostNameError extends SplitDomainError {
  constructor() {
    super("Ghost display name must be between 1 and 80 characters after trim");
    this.name = "InvalidGhostNameError";
  }
}

export class DuplicateGhostNameError extends SplitDomainError {
  constructor() {
    super("A ghost with this name already exists in the group");
    this.name = "DuplicateGhostNameError";
  }
}

export class AlreadySplitGroupMemberError extends SplitDomainError {
  constructor() {
    super("This user is already a member of the split group");
    this.name = "AlreadySplitGroupMemberError";
  }
}

export class GhostCannotPayError extends SplitDomainError {
  constructor() {
    super("A ghost member cannot pay an expense");
    this.name = "GhostCannotPayError";
  }
}

export class NotSplitGroupUserMemberError extends SplitDomainError {
  constructor() {
    super("Actor is not a user member of this split group");
    this.name = "NotSplitGroupUserMemberError";
  }
}

export class ForbiddenSplitGroupActionError extends SplitDomainError {
  constructor(message = "Forbidden split group action") {
    super(message);
    this.name = "ForbiddenSplitGroupActionError";
  }
}

export class SplitGroupTooSmallError extends SplitDomainError {
  constructor() {
    super("A split requires at least two current members");
    this.name = "SplitGroupTooSmallError";
  }
}

export class SplitMemberNotInGroupError extends SplitDomainError {
  constructor() {
    super("Share, payer, or settlement party is not a current group member");
    this.name = "SplitMemberNotInGroupError";
  }
}

export class SplitCurrencyMismatchError extends SplitDomainError {
  constructor() {
    super("Expense currency must match the split group currency");
    this.name = "SplitCurrencyMismatchError";
  }
}

export class InvalidPublicShareTokenError extends SplitDomainError {
  constructor() {
    super("Invalid public share token");
    this.name = "InvalidPublicShareTokenError";
  }
}

export class SplitNotFoundError extends SplitDomainError {
  constructor() {
    super("Split group not found");
    this.name = "SplitNotFoundError";
  }
}

export class CannotRemoveGroupCreatorError extends SplitDomainError {
  constructor() {
    super("The group creator cannot be removed");
    this.name = "CannotRemoveGroupCreatorError";
  }
}

export class MemberHasSplitHistoryError extends SplitDomainError {
  constructor() {
    super("A member with splits or settlements cannot be removed");
    this.name = "MemberHasSplitHistoryError";
  }
}
