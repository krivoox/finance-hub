/**
 * Pure profile validators (SPEC-01 T-05).
 *
 * No I/O, no framework — safe to import from anywhere.
 * The Server Action layer converts these errors into user-facing messages.
 */

export const SUPPORTED_CURRENCIES = [
  "ARS",
  "USD",
  "EUR",
  "BRL",
  "CLP",
  "UYU",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 60;

export class ProfileValidationError extends Error {
  readonly field: "displayName" | "preferredCurrency" | "timezone";

  constructor(
    field: ProfileValidationError["field"],
    message: string,
  ) {
    super(message);
    this.name = "ProfileValidationError";
    this.field = field;
  }
}

export function isSupportedCurrency(code: unknown): code is SupportedCurrency {
  if (typeof code !== "string") return false;
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/**
 * Validates an IANA-like timezone using the runtime `Intl` API.
 * Pure: no side effects, deterministic given the runtime tz database.
 */
export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string") return false;
  const trimmed = tz.trim();
  if (trimmed.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function normalizeDisplayName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const collapsed = raw.trim().replace(/\s+/g, " ");
  return collapsed.length === 0 ? undefined : collapsed;
}

export type ProfileUpdateInput = {
  displayName?: string;
  preferredCurrency: string;
  timezone: string;
};

export type ProfileUpdateNormalized = {
  displayName?: string;
  preferredCurrency: SupportedCurrency;
  timezone: string;
};

export function validateProfileUpdate(
  input: ProfileUpdateInput,
): ProfileUpdateNormalized {
  const displayName = normalizeDisplayName(input.displayName);
  if (displayName !== undefined) {
    if (displayName.length < DISPLAY_NAME_MIN_LENGTH) {
      throw new ProfileValidationError(
        "displayName",
        `displayName must be at least ${DISPLAY_NAME_MIN_LENGTH} characters`,
      );
    }
    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new ProfileValidationError(
        "displayName",
        `displayName must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
      );
    }
  }

  if (!isSupportedCurrency(input.preferredCurrency)) {
    throw new ProfileValidationError(
      "preferredCurrency",
      `Unsupported currency: ${input.preferredCurrency}`,
    );
  }

  if (!isValidTimezone(input.timezone)) {
    throw new ProfileValidationError(
      "timezone",
      `Invalid IANA timezone: ${input.timezone}`,
    );
  }

  return {
    displayName,
    preferredCurrency: input.preferredCurrency,
    timezone: input.timezone.trim(),
  };
}
