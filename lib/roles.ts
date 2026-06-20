// Role helpers shared by server and client code.

import { Role } from "@/lib/generated/prisma/enums";

/** Home route for each role — where `/dashboard` sends a signed-in user. */
const ROLE_HOME: Record<Role, string> = {
  [Role.ADMIN]: "/admin",
  [Role.TEACHER]: "/teacher",
  [Role.STUDENT]: "/student",
};

/** The dashboard path a user should land on, based on their role. */
export function roleHomePath(role: Role): string {
  return ROLE_HOME[role] ?? "/dashboard";
}
