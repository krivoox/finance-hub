import { headers } from "next/headers";

import { env } from "@/lib/env";

/**
 * Origin of the current request (proto + host).
 * Share / invite links must match the URL the user is on — not the
 * ephemeral Vercel hostname, which can sit behind SSO on Preview.
 */
export function originFromForwardedHeaders(input: {
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  fallbackOrigin: string;
}): string {
  const host =
    firstHeaderValue(input.forwardedHost) ||
    firstHeaderValue(input.host) ||
    null;
  if (!host) return input.fallbackOrigin.replace(/\/$/, "");

  const forwardedProto = firstHeaderValue(input.forwardedProto);
  const proto =
    forwardedProto ??
    (isLocalHost(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  return originFromForwardedHeaders({
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    fallbackOrigin: env.BETTER_AUTH_URL,
  });
}

function firstHeaderValue(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.split(",")[0]?.trim();
  return value && value.length > 0 ? value : null;
}

function isLocalHost(host: string): boolean {
  const hostname = host.split(":")[0] ?? host;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}
