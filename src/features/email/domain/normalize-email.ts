import { InvalidEmailAddressError } from "./errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    throw new InvalidEmailAddressError();
  }
  return email;
}
