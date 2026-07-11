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

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = Boolean(sessionCookie);
  const isAuthForm = matchesPrefix(pathname, AUTH_FORM_ROUTES);
  const isAlwaysPublic = matchesPrefix(pathname, ALWAYS_PUBLIC_PREFIXES);
  const isPublic = isAuthForm || isAlwaysPublic;

  if (!isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users should not stay on login/registro forms,
  // but they MUST be able to open invite links.
  if (isAuthenticated && isAuthForm) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
