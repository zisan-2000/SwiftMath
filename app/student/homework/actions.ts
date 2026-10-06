"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { finishHomeworkSubmission, HomeworkError, startHomeworkSubmission } from "@/server/homework";
import { HomeworkPhotoError } from "@/server/homework-photos";

function target(message: string, ok = false) {
  return `/student/homework?${ok ? "success" : "error"}=${encodeURIComponent(message)}`;
}

export async function startHomeworkAction(formData: FormData) {
  const student = await requirePermission(PERMISSIONS.STUDENT_HOMEWORK_SUBMIT);
  try {
    await startHomeworkSubmission(
      student,
      String(formData.get("expectationId") ?? ""),
      String(formData.get("pageNumber") ?? ""),
      formData.get("firstPhoto") as File,
    );
  } catch (error) {
    if (error instanceof HomeworkError || error instanceof HomeworkPhotoError) redirect(target(error.message));
    throw error;
  }
  revalidatePath("/student/homework");
  redirect(target("First photo saved. Timer started; upload the final photo when finished.", true));
}

export async function finishHomeworkAction(formData: FormData) {
  const student = await requirePermission(PERMISSIONS.STUDENT_HOMEWORK_SUBMIT);
  try {
    await finishHomeworkSubmission(student, String(formData.get("submissionId") ?? ""), formData.get("finalPhoto") as File);
  } catch (error) {
    if (error instanceof HomeworkError || error instanceof HomeworkPhotoError) redirect(target(error.message));
    throw error;
  }
  revalidatePath("/student/homework");
  redirect(target("Homework submitted for teacher review.", true));
}
