import type { GoalKind, GoalStatus } from "@/features/goals/domain";

export const GOAL_KIND_LABEL_ES: Record<GoalKind, string> = {
  save: "Ahorro",
  debt_payoff: "Pago de deuda",
};

export const GOAL_STATUS_LABEL_ES: Record<GoalStatus, string> = {
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
};
