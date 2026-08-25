import { MD_MIN_WIDTH_PX } from "@/lib/breakpoints";

/**
 * Viewport hint for RSC trees that differ at `md` (Panel home vs desktop).
 * Not a money cache — only which read model to start. SPEC-20 still applies.
 */
export const SHELL_LAYOUT_COOKIE = "fh-shell";
export const SHELL_LAYOUT_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export type ShellLayout = "compact" | "full";

const SHELL_LAYOUTS = new Set<ShellLayout>(["compact", "full"]);

export function parseShellLayout(
  value: string | undefined | null,
): ShellLayout | null {
  if (value && SHELL_LAYOUTS.has(value as ShellLayout)) {
    return value as ShellLayout;
  }
  return null;
}

/** Mobile-first: unknown / missing cookie → compact (phone home). */
export function resolveShellLayout(
  value: string | undefined | null,
): ShellLayout {
  return parseShellLayout(value) ?? "compact";
}

export function shellLayoutFromMatchMedia(matchesMdUp: boolean): ShellLayout {
  return matchesMdUp ? "full" : "compact";
}

export function mdUpMediaQuery(): string {
  return `(min-width: ${MD_MIN_WIDTH_PX}px)`;
}

export function shellLayoutCookieString(layout: ShellLayout): string {
  return `${SHELL_LAYOUT_COOKIE}=${layout}; path=/; max-age=${SHELL_LAYOUT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function readShellLayoutCookie(cookieHeader: string): ShellLayout | null {
  const escaped = SHELL_LAYOUT_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escaped}=(compact|full)(?:;|$)`),
  );
  return parseShellLayout(match?.[1]);
}
