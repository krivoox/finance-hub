import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Auth form routes: redirect authenticated users away to the dashboard. */
const AUTH_FORM_ROUTES = [
  "/login",
  "/registro",
  "/forgot-password",
  "/reset-password",
];

/** Public routes that both guests and signed-in users may visit. */
const ALWAYS_PUBLIC_PREFIXES = ["/invitaciones"];

/** Exact public paths (marketing + crawl surfaces). */
const PUBLIC_EXACT = new Set([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
]);

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (matchesPrefix(pathname, AUTH_FORM_ROUTES)) return true;
  if (matchesPrefix(pathname, ALWAYS_PUBLIC_PREFIXES)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = getSessionCookie(request);
  const hasSessionCookie = Boolean(sessionCookie);
  const isPublic = isPublicPath(pathname);

  // Cookie presence is optimistic only — never bounce auth forms away here.
  // An invalid/stale cookie would loop: /login → /onboarding → /login (flicker).
  // Valid sessions are redirected from login/registro via getSession() in the page.
  if (!hasSessionCookie && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
