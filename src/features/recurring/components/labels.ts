import type {
  OccurrenceStatus,
  RecurringFrequency,
  RecurringPausedReason,
  RecurringRuleStatus,
  RecurringRuleType,
} from "@/features/recurring/domain";

export const RECURRING_TYPE_LABEL_ES: Record<RecurringRuleType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
};

export const RECURRING_FREQUENCY_LABEL_ES: Record<RecurringFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

export const RECURRING_STATUS_LABEL_ES: Record<RecurringRuleStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  ended: "Finalizada",
};

export const RECURRING_PAUSED_REASON_LABEL_ES: Record<
  RecurringPausedReason,
  string
> = {
  manual: "Pausa manual",
  account_archived: "Cuenta archivada",
};

export const OCCURRENCE_STATUS_LABEL_ES: Record<OccurrenceStatus, string> = {
  materialized: "Registrada",
  pending_past: "Vencida",
  pending_today: "Hoy",
  pending_upcoming: "Próxima",
  pending_future: "Futura",
};
