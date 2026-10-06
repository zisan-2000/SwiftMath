"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Role } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";
import { requireAdminPermission } from "@/lib/session";
import {
  AcademicLevelError,
  createAcademicLevel,
  updateAcademicLevel,
} from "@/server/academic-levels";

function destination(message: string, ok = false) {
  return `/admin/academic-levels?${ok ? "success" : "error"}=${encodeURIComponent(message)}`;
}

function parseOrder(value: FormDataEntryValue | null) {
  const order = Number(String(value ?? ""));
  return Number.isInteger(order) ? order : 0;
}

export async function createAcademicLevelAction(formData: FormData) {
  const user = await requireAdminPermission(PERMISSIONS.ACADEMIC_LEVEL_MANAGE);
  try {
    await createAcademicLevel(
      { id: user.id, instituteId: user.instituteId, role: Role.ADMIN },
      { name: String(formData.get("name") ?? ""), orderIndex: parseOrder(formData.get("orderIndex")) },
    );
  } catch (error) {
    if (error instanceof AcademicLevelError || (typeof error === "object" && error && "code" in error && error.code === "P2002")) {
      redirect(destination(error instanceof AcademicLevelError ? error.message : "That order is already in use."));
    }
    throw error;
  }
  revalidatePath("/admin/academic-levels");
  redirect(destination("Academic level created.", true));
}

export async function updateAcademicLevelAction(formData: FormData) {
  const user = await requireAdminPermission(PERMISSIONS.ACADEMIC_LEVEL_MANAGE);
  try {
    await updateAcademicLevel(
      { id: user.id, instituteId: user.instituteId, role: Role.ADMIN },
      String(formData.get("levelId") ?? ""),
      {
        name: String(formData.get("name") ?? ""),
        orderIndex: parseOrder(formData.get("orderIndex")),
        isActive: formData.get("isActive") === "on",
      },
    );
  } catch (error) {
    if (error instanceof AcademicLevelError || (typeof error === "object" && error && "code" in error && error.code === "P2002")) {
      redirect(destination(error instanceof AcademicLevelError ? error.message : "That order is already in use."));
    }
    throw error;
  }
  revalidatePath("/admin/academic-levels");
  redirect(destination("Academic level updated.", true));
}
