// Trusted, server-only user provisioning.
//
// This is the ONLY place users are created in Phase 1. Public sign-up is
// disabled in `lib/auth.ts`, so an account can only come into existence through
// here — which means `role` and `instituteId` are always set by code we
// control, never by the person signing up. Teacher/admin creation flows and the
// seed script call this helper.

import "server-only";

import { hashPassword, verifyPassword } from "better-auth/crypto";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

export interface CreateUserAccountParams {
  email: string;
  password: string;
  name: string;
  role: Role;
  instituteId: string;
  /** Optional group placement (used when a teacher adds a student). */
  groupId?: string;
}

/**
 * Create a user plus their email/password credentials.
 *
 * We write the `user` row and a matching `account` row in one transaction,
 * mirroring the exact shape better-auth uses for email/password
 * (providerId "credential", accountId === user.id, password hashed with
 * better-auth's own hasher). That guarantees sign-in verifies correctly.
 *
 * Throws if the email is already taken (unique constraint).
 */
export async function createUserAccount(params: CreateUserAccountParams) {
  const { email, password, name, role, instituteId, groupId } = params;

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        role,
        instituteId,
        groupId,
        // Provisioned by trusted staff — Phase 1 has no email-verification flow.
        emailVerified: true,
      },
    });

    await tx.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });

    return user;
  });
}

/**
 * Force-set a user's email/password credential to a new password. This is the
 * trusted "reset" primitive used by staff (admin/teacher) flows — it does NOT
 * ask for the old password, so callers MUST verify they're allowed to reset
 * this particular user first (see resetUserPassword / resetStudentPassword).
 *
 * As a security measure the target's existing sessions are revoked, so the new
 * password takes effect everywhere and any old logged-in device is signed out.
 * If somehow no credential row exists, one is created (mirrors createUserAccount).
 */
export async function setUserPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.account.updateMany({
      where: { userId, providerId: "credential" },
      data: { password: passwordHash },
    });

    if (updated.count === 0) {
      await tx.account.create({
        data: {
          userId,
          accountId: userId,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }

    // Revoke all of the target's sessions so the reset is effective immediately.
    await tx.session.deleteMany({ where: { userId } });
  });
}

/** Outcome of a self-service password change. */
export type ChangePasswordResult = "ok" | "wrong-current" | "no-credential";

/**
 * Self-service password change: verifies the user's *current* password before
 * setting the new one. Used by the account page. The current session is left
 * intact (the user stays signed in on this device).
 */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const credential = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true, password: true },
  });

  if (!credential?.password) return "no-credential";

  const valid = await verifyPassword({
    hash: credential.password,
    password: currentPassword,
  });
  if (!valid) return "wrong-current";

  const passwordHash = await hashPassword(newPassword);
  await prisma.account.update({
    where: { id: credential.id },
    data: { password: passwordHash },
  });

  return "ok";
}
