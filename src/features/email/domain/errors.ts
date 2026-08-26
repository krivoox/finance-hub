export class EmailDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EmailDomainError";
    this.code = code;
  }
}

export class InvalidFromAddressError extends EmailDomainError {
  constructor(message = "Dirección de remitente inválida") {
    super("invalid_from_address", message);
  }
}

export class InvalidEmailAddressError extends EmailDomainError {
  constructor(message = "Email inválido") {
    super("invalid_email", message);
  }
}

export class MarketingConsentRequiredError extends EmailDomainError {
  constructor() {
    super(
      "marketing_consent_required",
      "El alta a novedades requiere consentimiento explícito",
    );
  }
}

export class MissingUnsubscribeError extends EmailDomainError {
  constructor() {
    super(
      "missing_unsubscribe",
      "Los emails de marketing deben incluir {{{RESEND_UNSUBSCRIBE_URL}}}",
    );
  }
}

export class InvalidBroadcastContentError extends EmailDomainError {
  constructor(message = "El broadcast necesita nombre, asunto y cuerpo HTML") {
    super("invalid_broadcast_content", message);
  }
}

export class MissingMarketingSegmentError extends EmailDomainError {
  constructor() {
    super(
      "missing_marketing_segment",
      "Falta RESEND_MARKETING_SEGMENT_ID para enviar broadcasts",
    );
  }
}

export class MissingResetUrlError extends EmailDomainError {
  constructor() {
    super("missing_reset_url", "La URL de restablecimiento es requerida");
  }
}
