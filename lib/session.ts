// Server-side session access.
//
// Thin, typed wrappers around better-auth's `getSession` for use in Server
// Components, Route Handlers, and Server Actions. Role-based guards
// (requireRole, requireUser) redirect unauthenticated or unauthorised callers.

import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type AuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

/**
 * Session user with `role` narrowed from a plain string to our `Role` enum.
 * better-auth stores the role as a string column, so we re-type it here.
 */
export type SessionUser = AuthSession["user"] & { role: Role };

/** The full session ({ session, user }) or null if not signed in. */
export async function getCurrentSession(): Promise<AuthSession | null> {
  return auth.api.getSession({ headers: await headers() });
}

/** Just the signed-in user (with typed `role`), or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  return session ? (session.user as SessionUser) : null;
}

// ---------------------------------------------------------------------------
// Guards
//
// These are the REAL, trusted access checks (the middleware only does a fast,
// optimistic cookie check to avoid UI flashes). Call them at the top of any
// protected Server Component / Server Action. They `redirect()` and never
// return when access is denied, so the value they return is always a valid,
// authorised user.
// ---------------------------------------------------------------------------

/** Require a signed-in user, or redirect to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Trusted soft-disable check: a disabled account must not be able to use the
  // app even with a valid session cookie. We read `isActive` fresh from the DB
  // (not the possibly-stale session) so a disable takes effect on the very next
  // request. We also check the user's INSTITUTE: a Super Admin can disable a
  // whole tenant, which must lock out all its members. SUPER_ADMIN is exempt
  // from the institute check (they're cross-tenant and would otherwise lock
  // themselves out if their home institute were disabled). If disabled, revoke
  // their sessions and bounce to login.
  const status = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isActive: true, institute: { select: { isActive: true } } },
  });
  const instituteBlocked =
    user.role !== Role.SUPER_ADMIN && !status?.institute?.isActive;
  if (!status?.isActive || instituteBlocked) {
    await prisma.session.deleteMany({ where: { userId: user.id } });
    redirect("/login?disabled=1");
  }

  return user;
}

/**
 * Require a signed-in user whose role is one of `roles`. A signed-in user with
 * the wrong role is sent back to their own dashboard (which routes them to the
 * area they're allowed to see); anonymous users go to login.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Require the platform-level Super Admin. Convenience wrapper around
 * `requireRole` used to guard the cross-tenant `/super` area. Unlike the
 * institute-scoped roles, a Super Admin is allowed to read/manage data across
 * every institute, so server logic behind this guard must NOT scope by
 * `instituteId`.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  return requireRole(Role.SUPER_ADMIN);
}
