"use server";

import { revalidatePath } from "next/cache";

import { ClassPerformanceStatus } from "@/lib/generated/prisma/enums";
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

  const entries = studentIds.map((studentId) => ({
    studentId,
    mark: String(formData.get(`mark:${studentId}`) ?? ""),
    status:
      formData.get(`status:${studentId}`) === ClassPerformanceStatus.ABSENT
        ? ClassPerformanceStatus.ABSENT
        : ClassPerformanceStatus.PRESENT,
  }));

  try {
    const result = await saveClassPerformance(teacher, {
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

    return {
      ok: true,
      savedDate: classDate,
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

