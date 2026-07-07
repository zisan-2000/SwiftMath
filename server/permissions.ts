import "server-only";

import { cache } from "react";

import {
  getRoleDefaultPermissions,
  type Permission,
} from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

/** Phase 1 resolver: role defaults only. DB grants are added in Phase 2. */
export const getEffectivePermissions = cache(
  async (user: Pick<SessionUser, "role">): Promise<Set<Permission>> => {
    return getRoleDefaultPermissions(user.role);
  },
);

export async function can(
  user: Pick<SessionUser, "role">,
  permission: Permission,
): Promise<boolean> {
  return (await getEffectivePermissions(user)).has(permission);
}
