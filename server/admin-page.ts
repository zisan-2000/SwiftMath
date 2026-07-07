// Cached page loaders for the admin area.

import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { Role } from "@/lib/generated/prisma/enums";
import { requireRole } from "@/lib/session";
import { loadInstituteBranding } from "@/server/institute-branding";
import { getLevel, getAdminGroup, getAdminTeacher, getAdminStudentProgress } from "@/server/admin";
import { listTeacherPermissionControls } from "@/server/user-permissions";

/** Signed-in admin + institute branding. */
export const loadAdminPageContext = cache(async () => {
  const admin = await requireRole(Role.ADMIN);
  const institute = await loadInstituteBranding(admin.instituteId);
  return { admin, institute };
});

/** Admin + institute + scoped level. Calls `notFound()` when missing. */
export const loadAdminLevelPageContext = cache(async (levelId: string) => {
  const { admin, institute } = await loadAdminPageContext();
  const level = await getLevel(admin, levelId);
  if (!level) notFound();
  return { admin, institute, level, levelId };
});

/** Admin + institute + scoped group. Calls `notFound()` when missing. */
export const loadAdminGroupPageContext = cache(async (groupId: string) => {
  const { admin, institute } = await loadAdminPageContext();
  const group = await getAdminGroup(admin, groupId);
  if (!group) notFound();
  return { admin, institute, group, groupId };
});

/** Admin + institute + scoped teacher. Calls `notFound()` when missing. */
export const loadAdminTeacherPageContext = cache(async (teacherId: string) => {
  const { admin, institute } = await loadAdminPageContext();
  const teacher = await getAdminTeacher(admin, teacherId);
  if (!teacher) notFound();
  const teacherPermissions = await listTeacherPermissionControls(
    admin,
    teacherId,
  );
  return { admin, institute, teacher, teacherId, teacherPermissions };
});

/** Admin + institute + scoped student progress. Calls `notFound()` when missing. */
export const loadAdminStudentPageContext = cache(async (studentId: string) => {
  const { admin, institute } = await loadAdminPageContext();
  const progress = await getAdminStudentProgress(admin, studentId);
  if (!progress) notFound();
  return { admin, institute, progress, studentId };
});
