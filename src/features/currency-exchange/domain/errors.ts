/**
 * Typed domain errors for Currency Exchange (SPEC-16).
 */

export class CurrencyExchangeDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrencyExchangeDomainError";
  }
}

/** SPEC-16 T-02 — Both accounts must have different currencies. */
export class SameCurrencyExchangeError extends CurrencyExchangeDomainError {
  constructor() {
    super("El canje requiere cuentas con monedas distintas");
    this.name = "SameCurrencyExchangeError";
  }
}

export class InvalidExchangeAmountError extends CurrencyExchangeDomainError {
  constructor(message = "Los montos del canje deben ser mayores a 0") {
    super(message);
    this.name = "InvalidExchangeAmountError";
  }
}

export class SameAccountExchangeError extends CurrencyExchangeDomainError {
  constructor() {
    super("Origen y destino deben ser cuentas distintas");
    this.name = "SameAccountExchangeError";
  }
}

export class UnsupportedExchangeCurrencyError extends CurrencyExchangeDomainError {
  constructor(currency: string) {
    super(
      `Moneda "${currency}" no soportada para canje. Permitidas: ARS, USD.`,
    );
    this.name = "UnsupportedExchangeCurrencyError";
  }
}

export class CurrencyExchangeNotFoundError extends CurrencyExchangeDomainError {
  constructor() {
    super("El canje no existe");
    this.name = "CurrencyExchangeNotFoundError";
  }
}
