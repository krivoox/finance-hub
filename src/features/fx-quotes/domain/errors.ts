export class FxQuotesDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FxQuotesDomainError";
  }
}

export class InvalidUsdQuoteRateError extends FxQuotesDomainError {
  constructor(message = "La cotización debe ser mayor a 0") {
    super(message);
    this.name = "InvalidUsdQuoteRateError";
  }
}

export class IncompleteUsdQuoteSnapshotError extends FxQuotesDomainError {
  constructor(
    message = "El snapshot necesita oficial y bolsa (MEP) con tasas válidas",
  ) {
    super(message);
    this.name = "IncompleteUsdQuoteSnapshotError";
  }
}

export class MepQuoteUnavailableError extends FxQuotesDomainError {
  constructor(message = "No hay cotización MEP (bolsa) disponible") {
    super(message);
    this.name = "MepQuoteUnavailableError";
  }
}
