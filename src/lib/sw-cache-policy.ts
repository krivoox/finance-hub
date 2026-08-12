/**
 * Mirrors `public/sw.js` cache rules for unit tests (SPEC-20 H4).
 * Keep in sync with the Service Worker — SW is source of runtime truth.
 */

export const SW_STATIC_PREFIX = "/_next/static/";
export const SW_PRECACHE_PATHS = ["/offline"] as const;

export function isSwCacheableStaticPath(pathname: string): boolean {
  return pathname.startsWith(SW_STATIC_PREFIX);
}

export function isSwForbiddenMoneyPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (path.startsWith("/api/")) return true;
  // App money surfaces must never be treated as offline cache SoT.
  const moneyPrefixes = [
    "/dashboard",
    "/accounts",
    "/transactions",
    "/budgets",
    "/goals",
    "/groups",
  ];
  return moneyPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function shouldPrecachePath(pathname: string): boolean {
  return (SW_PRECACHE_PATHS as readonly string[]).includes(pathname);
}
