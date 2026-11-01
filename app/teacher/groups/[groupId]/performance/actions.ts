"use server";

import { revalidatePath } from "next/cache";

import { ClassPerformanceStatus } from "@/lib/generated/prisma/enums";
import { CLASS_PERFORMANCE_NOT_ENTERED } from "@/lib/class-performance";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import {
  ClassPerformanceError,
  saveClassPerformance,
} from "@/server/class-performance";

export interface SaveClassPerformanceState {
  ok?: boolean;
  message?: string;
  savedDate?: string;
  revision?: number;
  sheetId?: string;
}

export async function saveClassPerformanceAction(
  _previous: SaveClassPerformanceState,
  formData: FormData,
): Promise<SaveClassPerformanceState> {
  const teacher = await requirePermission(PERMISSIONS.CLASS_PERFORMANCE_MANAGE);
  const groupId = String(formData.get("groupId") ?? "");
  const classDate = String(formData.get("classDate") ?? "");
  const maximumMark = String(formData.get("maximumMark") ?? "");
  const studentIds = formData.getAll("studentId").map(String);

  const entries = studentIds.map((studentId) => {
    const rawStatus = formData.get(`status:${studentId}`);
    const status =
      rawStatus === ClassPerformanceStatus.ABSENT
        ? ClassPerformanceStatus.ABSENT
        : rawStatus === CLASS_PERFORMANCE_NOT_ENTERED
          ? CLASS_PERFORMANCE_NOT_ENTERED
          : ClassPerformanceStatus.PRESENT;
    return {
      studentId,
      mark: String(formData.get(`mark:${studentId}`) ?? ""),
      status,
    };
  });

  try {
    const result = await saveClassPerformance(teacher, {
      mode: formData.get("mode") as "create" | "update",
      sheetId: String(formData.get("sheetId") ?? "") || null,
      revision: formData.get("revision")
        ? Number(formData.get("revision"))
        : null,
      groupId,
      classDate,
      maximumMark,
      entries,
    });

    revalidatePath(`/teacher/groups/${groupId}/performance`);
    revalidatePath(`/teacher/groups/${groupId}/performance/ranking`);
    revalidatePath(`/teacher/groups/${groupId}/students`);
    revalidatePath("/teacher/activity");
    revalidatePath("/student");
    revalidatePath("/teacher/groups/[groupId]/students/[studentId]", "page");
    revalidatePath("/admin/students/[studentId]", "page");

    return {
      ok: true,
      savedDate: classDate,
      sheetId: result.sheetId,
      revision: result.revision,
      message: result.created
        ? "Class performance saved."
        : "Class performance updated.",
    };
  } catch (error) {
    if (error instanceof ClassPerformanceError) {
      return { message: error.message };
    }
    throw error;
  }
}
