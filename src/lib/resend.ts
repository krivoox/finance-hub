import { Resend } from "resend";

import { env } from "@/lib/env";

let client: Resend | null = null;

/** Lazy Resend SDK client. Null when `RESEND_API_KEY` is unset. */
export function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  if (!client) {
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
}
