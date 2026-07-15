import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Per-request memoization: layout + pages often call getSession in the same RSC
 * render; without cache() each call repeats Better Auth work.
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

export type Session = Awaited<ReturnType<typeof getSession>>;
