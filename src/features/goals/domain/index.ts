export {
  GoalCurrencyMismatchError,
  GoalDomainError,
  GoalLinkedAccountInvalidError,
  GoalLinkedAccountRequiredError,
  GoalNotActiveError,
  GoalNotFoundError,
  InvalidContributionAmountError,
  InvalidGoalNameError,
  InvalidTargetAmountError,
} from "./errors";

export {
  GOAL_NAME_MAX_LENGTH,
  applyContribution,
  assertCanContribute,
  assertGoalContributionTransferAccounts,
  assertGoalCurrencyAllowed,
  assertGoalCurrencyMatchesWorkspace,
  assertValidContribution,
  assertValidGoalName,
  assertValidTargetAmount,
  normalizeGoalName,
  progressPercent,
  reverseContribution,
} from "./guards";
export type {
  ApplyContributionInput,
  ApplyContributionResult,
  AssertGoalContributionTransferAccountsInput,
  AssertGoalContributionTransferAccountsResult,
  GoalContributionAccountLike,
  ReverseContributionInput,
  ReverseContributionResult,
} from "./guards";

export {
  GOAL_KINDS,
  GOAL_STATUSES,
  isGoalKind,
  isGoalStatus,
} from "./types";
export type { GoalContributionLike, GoalKind, GoalLike, GoalStatus } from "./types";

export { assertCanMutateGoals, assertCanReadGoals } from "./authz";
