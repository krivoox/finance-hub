import { InvalidFromAddressError } from "./errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedFromAddress = {
  name: string | null;
  email: string;
  formatted: string;
};

function isEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

/**
 * Accepts `Name <user@domain>` or a bare email. Used to validate `EMAIL_FROM`
 * before calling Resend (the `from` domain must match a verified domain).
 */
export function parseFromAddress(raw: string): ParsedFromAddress {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new InvalidFromAddressError();
  }

  const named = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (named) {
    const name = named[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    const email = named[2]?.trim().toLowerCase() ?? "";
    if (!name || !isEmail(email)) {
      throw new InvalidFromAddressError();
    }
    return {
      name,
      email,
      formatted: `${name} <${email}>`,
    };
  }

  if (!isEmail(trimmed)) {
    throw new InvalidFromAddressError();
  }

  const email = trimmed.toLowerCase();
  return { name: null, email, formatted: email };
}

export function assertValidFromAddress(raw: string): string {
  return parseFromAddress(raw).formatted;
}
