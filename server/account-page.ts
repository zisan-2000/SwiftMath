// Cached page loaders for the account area (all roles).

import "server-only";

import { cache } from "react";

import { Role } from "@/lib/generated/prisma/enums";
import { requireUser } from "@/lib/session";
import {
  loadInstituteBranding,
  type InstituteBranding,
} from "@/server/institute-branding";

export type { InstituteBranding };

/** Signed-in user + tenant branding (null for Super Admin). */
export const loadAccountPageContext = cache(async () => {
  const user = await requireUser();
  const institute =
    user.role === Role.SUPER_ADMIN
      ? null
      : await loadInstituteBranding(user.instituteId);
  return { user, institute };
});
