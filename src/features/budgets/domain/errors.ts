/**
 * Typed domain errors for Budgets (SPEC-07).
 *
 * Server Actions map these to user-facing messages via `budgetErrorToMessage`
 * so callers can catch the base `BudgetDomainError` and treat any subclass as
 * a validation failure.
 */

export class BudgetDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetDomainError";
  }
}

export class InvalidBudgetNameError extends BudgetDomainError {
  constructor(message = "El nombre del presupuesto es obligatorio") {
    super(message);
    this.name = "InvalidBudgetNameError";
  }
}

export class InvalidBudgetLimitError extends BudgetDomainError {
  constructor(message = "El límite debe ser un entero positivo mayor que 0") {
    super(message);
    this.name = "InvalidBudgetLimitError";
  }
}

export class InvalidBudgetPeriodError extends BudgetDomainError {
  constructor(message = "Periodo de presupuesto inválido") {
    super(message);
    this.name = "InvalidBudgetPeriodError";
  }
}

export class MissingBudgetEndDateError extends BudgetDomainError {
  constructor() {
    super("Los presupuestos con periodo `custom` requieren una fecha de fin");
    this.name = "MissingBudgetEndDateError";
  }
}

export class InvalidBudgetEndDateError extends BudgetDomainError {
  constructor(message = "La fecha de fin debe ser posterior o igual a la de inicio") {
    super(message);
    this.name = "InvalidBudgetEndDateError";
  }
}

export class UnexpectedBudgetEndDateError extends BudgetDomainError {
  constructor() {
    super(
      "Solo los presupuestos `custom` aceptan una fecha de fin; los mensuales y semanales se derivan del anclaje",
    );
    this.name = "UnexpectedBudgetEndDateError";
  }
}

export class BudgetNotFoundError extends BudgetDomainError {
  constructor() {
    super("El presupuesto no existe");
    this.name = "BudgetNotFoundError";
  }
}

export class BudgetWorkspaceMismatchError extends BudgetDomainError {
  constructor() {
    super("El presupuesto pertenece a otro workspace");
    this.name = "BudgetWorkspaceMismatchError";
  }
}
