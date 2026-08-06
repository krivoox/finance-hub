"use server";

import { cookies, headers } from "next/headers";
import { APIError } from "better-auth/api";
import {
  parseSetCookieHeader,
  splitSetCookieHeader,
  toCookieOptions,
} from "better-auth/cookies";
import { auth } from "@/lib/auth";

function listSetCookieHeaders(responseHeaders: Headers): string[] {
  if (typeof responseHeaders.getSetCookie === "function") {
    const list = responseHeaders.getSetCookie();
    if (list.length > 0) return list;
  }
  return splitSetCookieHeader(responseHeaders.get("set-cookie") || "");
}

export type SignInGoogleIdTokenResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Exchange a GIS id_token for a Better Auth session, writing cookies via
 * Next's `cookies()` API (reliable in Server Actions / installed PWAs).
 */
export async function signInWithGoogleIdTokenAction(
  idToken: string,
): Promise<SignInGoogleIdTokenResult> {
  if (!idToken.trim()) {
    return { ok: false, error: "Token de Google inválido." };
  }

  try {
    const result = await auth.api.signInSocial({
      body: {
        provider: "google",
        idToken: { token: idToken },
      },
      headers: await headers(),
      returnHeaders: true,
    });

    const cookieStore = await cookies();
    for (const raw of listSetCookieHeaders(result.headers ?? new Headers())) {
      const parsed = parseSetCookieHeader(raw);
      parsed.forEach((value, key) => {
        if (!key) return;
        try {
          cookieStore.set(key, value.value, toCookieOptions(value));
        } catch {
          // Ignore immutable-cookie contexts; fixed nextCookies may have set them.
        }
      });
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        ok: false,
        error: error.message || "No pudimos continuar con Google.",
      };
    }
    return { ok: false, error: "No pudimos continuar con Google." };
  }
}
