import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  resolveEffectivePermissions,
  type Permission,
} from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

/** Resolve role defaults plus persisted per-user allow/deny overrides. */
export const getEffectivePermissions = cache(
  async (user: Pick<SessionUser, "id" | "role">): Promise<Set<Permission>> => {
    const overrides = await prisma.userPermission.findMany({
      where: { userId: user.id },
      select: { permission: true, effect: true },
    });

    return resolveEffectivePermissions(user.role, overrides);
  },
);

export async function can(
  user: Pick<SessionUser, "id" | "role">,
  permission: Permission,
): Promise<boolean> {
  return (await getEffectivePermissions(user)).has(permission);
}
