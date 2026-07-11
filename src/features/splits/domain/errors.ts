export class SplitDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitDomainError";
  }
}

export class NotAGroupWorkspaceError extends SplitDomainError {
  constructor() {
    super("Interpersonal balances are only available on group workspaces");
    this.name = "NotAGroupWorkspaceError";
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
