export {
  GoalCurrencyMismatchError,
  GoalDomainError,
  GoalLinkedAccountInvalidError,
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
  assertGoalCurrencyAllowed,
  assertGoalCurrencyMatchesWorkspace,
  assertValidContribution,
  assertValidGoalName,
  assertValidTargetAmount,
  normalizeGoalName,
  progressPercent,
} from "./guards";
export type {
  ApplyContributionInput,
  ApplyContributionResult,
} from "./guards";

export {
  GOAL_KINDS,
  GOAL_STATUSES,
  isGoalKind,
  isGoalStatus,
} from "./types";
export type { GoalContributionLike, GoalKind, GoalLike, GoalStatus } from "./types";

export { assertCanMutateGoals, assertCanReadGoals } from "./authz";
