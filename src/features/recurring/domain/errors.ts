/**
 * Typed domain errors for Recurring (SPEC-18).
 */

export class RecurringDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecurringDomainError";
  }
}

export class InvalidRecurringNameError extends RecurringDomainError {
  constructor(message = "El nombre de la recurrente es inválido") {
    super(message);
    this.name = "InvalidRecurringNameError";
  }
}

export class InvalidRecurringAmountError extends RecurringDomainError {
  constructor(message = "El monto debe ser un entero positivo (en centavos)") {
    super(message);
    this.name = "InvalidRecurringAmountError";
  }
}

export class InvalidRecurringDatesError extends RecurringDomainError {
  constructor(message = "Las fechas de la recurrente no son válidas") {
    super(message);
    this.name = "InvalidRecurringDatesError";
  }
}

export class RecurringTypeImmutableError extends RecurringDomainError {
  constructor() {
    super("El tipo de una recurrente no se puede cambiar");
    this.name = "RecurringTypeImmutableError";
  }
}

export class RecurringCurrencyImmutableError extends RecurringDomainError {
  constructor() {
    super("La moneda de una recurrente no se puede cambiar");
    this.name = "RecurringCurrencyImmutableError";
  }
}

export class RecurringRuleEndedError extends RecurringDomainError {
  constructor(message = "Esta recurrente está finalizada") {
    super(message);
    this.name = "RecurringRuleEndedError";
  }
}

export class RecurringRuleNotPausedError extends RecurringDomainError {
  constructor() {
    super("Solo se puede reanudar una recurrente pausada");
    this.name = "RecurringRuleNotPausedError";
  }
}

export class RecurringRuleNotActiveError extends RecurringDomainError {
  constructor() {
    super("Solo se puede pausar una recurrente activa");
    this.name = "RecurringRuleNotActiveError";
  }
}

export class AlreadyMaterializedError extends RecurringDomainError {
  readonly existingTransactionId: string | null;

  constructor(
    message = "Esta ocurrencia ya fue registrada",
    existingTransactionId: string | null = null,
  ) {
    super(message);
    this.name = "AlreadyMaterializedError";
    this.existingTransactionId = existingTransactionId;
  }
}

export class NotAScheduledOccurrenceError extends RecurringDomainError {
  constructor() {
    super("Esa fecha no corresponde a una ocurrencia de la plantilla");
    this.name = "NotAScheduledOccurrenceError";
  }
}

export class TooEarlyToMaterializeError extends RecurringDomainError {
  constructor() {
    super(
      "Todavía no se puede registrar esta ocurrencia (fecha demasiado futura)",
    );
    this.name = "TooEarlyToMaterializeError";
  }
}

export class CannotMaterializeRuleError extends RecurringDomainError {
  constructor(message = "No se puede materializar esta recurrente") {
    super(message);
    this.name = "CannotMaterializeRuleError";
  }
}

export class RecurringRuleNotFoundError extends RecurringDomainError {
  constructor(ruleId: string) {
    super(`Recurrente ${ruleId} no encontrada`);
    this.name = "RecurringRuleNotFoundError";
  }
}
