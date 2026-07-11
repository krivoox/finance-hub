/**
 * Typed domain errors for the Transactions feature (SPEC-05 / SPEC-06).
 *
 * Services and Server Actions surface these to the user via
 * `transactionErrorToMessage` in `actions/errors.ts`.
 */

import type { CategoryKind } from "@/features/categories/domain";
import type { TransactionType } from "./types";

export class TransactionDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionDomainError";
  }
}

export class InvalidAmountError extends TransactionDomainError {
  constructor(message = "El monto debe ser un entero positivo (en centavos)") {
    super(message);
    this.name = "InvalidAmountError";
  }
}

export class CategoryRequiredError extends TransactionDomainError {
  constructor(type: TransactionType) {
    super(`Las transacciones de tipo "${type}" requieren categoría`);
    this.name = "CategoryRequiredError";
  }
}

export class CategoryNotAllowedError extends TransactionDomainError {
  constructor() {
    super("Las transferencias no admiten categoría");
    this.name = "CategoryNotAllowedError";
  }
}

export class CategoryKindMismatchError extends TransactionDomainError {
  constructor(txType: TransactionType, categoryKind: CategoryKind) {
    super(
      `La categoría (${categoryKind}) no coincide con el tipo de transacción (${txType})`,
    );
    this.name = "CategoryKindMismatchError";
  }
}

export class AccountArchivedError extends TransactionDomainError {
  constructor() {
    super("La cuenta está archivada y no acepta nuevas transacciones");
    this.name = "AccountArchivedError";
  }
}

export class AccountWorkspaceMismatchError extends TransactionDomainError {
  constructor() {
    super("La cuenta no pertenece al workspace de la transacción");
    this.name = "AccountWorkspaceMismatchError";
  }
}

export class TransactionCurrencyMismatchError extends TransactionDomainError {
  constructor(txCurrency: string, accountCurrency: string) {
    super(
      `La moneda de la transacción (${txCurrency}) no coincide con la de la cuenta (${accountCurrency})`,
    );
    this.name = "TransactionCurrencyMismatchError";
  }
}

export class SameAccountTransferError extends TransactionDomainError {
  constructor() {
    super("Origen y destino de la transferencia deben ser cuentas distintas");
    this.name = "SameAccountTransferError";
  }
}

export class CounterpartyRequiredError extends TransactionDomainError {
  constructor() {
    super("La transferencia requiere una cuenta destino");
    this.name = "CounterpartyRequiredError";
  }
}

export class CounterpartyNotAllowedError extends TransactionDomainError {
  constructor() {
    super("Solo las transferencias admiten cuenta destino");
    this.name = "CounterpartyNotAllowedError";
  }
}

export class OccurredOnTooFutureError extends TransactionDomainError {
  constructor() {
    super("La fecha del movimiento no puede ser posterior a hoy");
    this.name = "OccurredOnTooFutureError";
  }
}

export class InvalidOccurredOnError extends TransactionDomainError {
  constructor() {
    super("La fecha del movimiento es inválida");
    this.name = "InvalidOccurredOnError";
  }
}

export class InvalidDescriptionError extends TransactionDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDescriptionError";
  }
}

export class TransactionNotFoundError extends TransactionDomainError {
  constructor(transactionId: string) {
    super(`Transacción ${transactionId} no encontrada`);
    this.name = "TransactionNotFoundError";
  }
}

export class TransactionTypeImmutableError extends TransactionDomainError {
  constructor() {
    super(
      "El tipo (income/expense/transfer) de un movimiento no puede modificarse",
    );
    this.name = "TransactionTypeImmutableError";
  }
}
