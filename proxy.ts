// Edge proxy (Next.js 16's renamed "middleware") — FAST, OPTIMISTIC auth
// routing only.
//
// It does NOT validate the session against the database; it only checks for the
// presence of better-auth's session cookie, to bounce clearly-anonymous users
// off protected routes and avoid a flash of protected UI. The real, trusted
// access checks live in `lib/session.ts` (requireUser / requireRole) and run in
// the protected Server Components themselves.
//
// IMPORTANT: the proxy must never redirect *based on cookie presence* in a way
// that fights the server-side guards. A stale cookie (session deleted/expired
// in the DB but still in the browser) passes this presence check yet fails the
// real check — so the only thing the proxy does is the one-directional
// "anonymous → login" bounce. Sending already-"logged-in" users away from
// /login is handled in the login page itself with a real session lookup, which
// avoids a /login ⇄ /dashboard redirect loop when the cookie is stale.

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Path prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/super",
  "/admin",
  "/teacher",
  "/student",
  "/account",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  // Anonymous user hitting a protected area → login, remembering the target.
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on the protected areas. /login handles its own redirect.
  matcher: [
    "/dashboard",
    "/super",
    "/super/:path*",
    "/admin",
    "/admin/:path*",
    "/teacher",
    "/teacher/:path*",
    "/student",
    "/student/:path*",
    "/account",
  ],
};
