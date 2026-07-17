import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Comma-separated workspace ids the user dismissed setup for (SPEC-15). */
export const SETUP_DISMISSED_COOKIE = "fh-setup-dismissed";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function parseDismissedIds(raw: string | undefined): string[] {
  if (!raw || raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export async function getDismissedSetupWorkspaceIds(): Promise<string[]> {
  const cookieStore = await cookies();
  return parseDismissedIds(cookieStore.get(SETUP_DISMISSED_COOKIE)?.value);
}

export async function isSetupDismissed(workspaceId: string): Promise<boolean> {
  const ids = await getDismissedSetupWorkspaceIds();
  return ids.includes(workspaceId);
}

export async function addSetupDismissedWorkspace(
  workspaceId: string,
): Promise<void> {
  const cookieStore = await cookies();
  const existing = parseDismissedIds(
    cookieStore.get(SETUP_DISMISSED_COOKIE)?.value,
  );
  if (existing.includes(workspaceId)) return;
  const next = [...existing, workspaceId];
  cookieStore.set(SETUP_DISMISSED_COOKIE, next.join(","), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function clearSetupDismissedWorkspace(
  workspaceId: string,
): Promise<void> {
  const cookieStore = await cookies();
  const existing = parseDismissedIds(
    cookieStore.get(SETUP_DISMISSED_COOKIE)?.value,
  );
  const next = existing.filter((id) => id !== workspaceId);
  if (next.length === 0) {
    cookieStore.delete(SETUP_DISMISSED_COOKIE);
    return;
  }
  cookieStore.set(SETUP_DISMISSED_COOKIE, next.join(","), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
}
