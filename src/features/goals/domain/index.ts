export {
  GoalCurrencyMismatchError,
  GoalDeleteConfirmationMismatchError,
  GoalDomainError,
  GoalLinkedAccountInvalidError,
  GoalLinkedAccountRequiredError,
  GoalNotActiveError,
  GoalNotEditableError,
  GoalNotFoundError,
  InvalidContributionAmountError,
  InvalidGoalNameError,
  InvalidTargetAmountError,
} from "./errors";

export {
  GOAL_NAME_MAX_LENGTH,
  applyContribution,
  applyGoalTargetChange,
  assertCanContribute,
  assertCanUpdateGoal,
  assertDeleteGoalConfirmation,
  assertGoalContributionTransferAccounts,
  assertGoalCurrencyAllowed,
  assertGoalCurrencyMatchesWorkspace,
  assertLinkedAccountForGoal,
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
  ApplyGoalTargetChangeInput,
  ApplyGoalTargetChangeResult,
  AssertGoalContributionTransferAccountsInput,
  AssertGoalContributionTransferAccountsResult,
  GoalContributionAccountLike,
  GoalLinkedAccountLike,
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
