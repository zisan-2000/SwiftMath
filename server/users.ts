// Trusted, server-only user provisioning.
//
// This is the ONLY place users are created in Phase 1. Public sign-up is
// disabled in `lib/auth.ts`, so an account can only come into existence through
// here — which means `role` and `instituteId` are always set by code we
// control, never by the person signing up. Teacher/admin creation flows and the
// seed script call this helper.

import "server-only";

import { hashPassword } from "better-auth/crypto";

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
