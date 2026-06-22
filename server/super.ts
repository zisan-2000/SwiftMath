// Trusted, server-only logic for the SUPER_ADMIN (platform operator) flow.
//
// Unlike the institute-scoped ADMIN, a Super Admin works ACROSS every
// institute. The functions here deliberately do NOT filter by `instituteId`:
// they aggregate and list platform-wide data. Callers (server actions / pages)
// must still gate access with `requireSuperAdmin()` — this module trusts that
// the caller is authorised.

import "server-only";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";

/** Platform-wide headline counts for the Super Admin dashboard. */
export async function getPlatformStats() {
  const [institutes, admins, teachers, students] = await Promise.all([
    prisma.institute.count(),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.TEACHER } }),
    prisma.user.count({ where: { role: Role.STUDENT } }),
  ]);
  return { institutes, admins, teachers, students };
}

/**
 * Every institute on the platform with its per-tenant user counts, newest
 * first. Used by the Super Admin institutes list.
 */
export async function listInstitutesWithStats() {
  const institutes = await prisma.institute.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true, groups: true, levels: true } },
    },
  });
  return institutes;
}
