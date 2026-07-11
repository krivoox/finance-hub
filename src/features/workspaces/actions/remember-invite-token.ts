"use server";

import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { INVITE_TOKEN_COOKIE } from "@/features/workspaces/services/invite-cookie";

/**
 * Sets the invite-token cookie from a Server Action / RSC-friendly call
 * (used by the public invite page).
 */
export async function rememberInviteTokenAction(
  token: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INVITE_TOKEN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}
