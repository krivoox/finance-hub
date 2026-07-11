import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Cookie holding an invite token while the user registers/logs in. */
export const INVITE_TOKEN_COOKIE = "fh-invite-token";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export async function setInviteTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INVITE_TOKEN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: SEVEN_DAYS_SECONDS,
  });
}

export async function getInviteTokenCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(INVITE_TOKEN_COOKIE)?.value ?? null;
}

export async function clearInviteTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(INVITE_TOKEN_COOKIE);
}

export function buildInviteUrl(token: string): string {
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "");
  return `${base}/invitaciones/${token}`;
}
