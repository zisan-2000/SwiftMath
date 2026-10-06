"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { HomeworkError, reviewHomeworkSubmission } from "@/server/homework";

function historyUrl(returnQuery: string, key: "error" | "success", message: string) {
  const params = new URLSearchParams(returnQuery);
  params.delete("error");
  params.delete("success");
  params.set(key, message);
  return `/teacher/homework/history?${params.toString()}`;
}

export async function reviewHomeworkFromHistoryAction(formData: FormData) {
  const teacher = await requirePermission(PERMISSIONS.HOMEWORK_MANAGE);
  const returnQuery = String(formData.get("returnQuery") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const status = Object.values(HomeworkSubmissionStatus).includes(rawStatus as HomeworkSubmissionStatus)
    ? rawStatus as HomeworkSubmissionStatus
    : HomeworkSubmissionStatus.REJECTED;
  const scoreText = String(formData.get("score") ?? "").trim();

  try {
    await reviewHomeworkSubmission(teacher, {
      submissionId: String(formData.get("submissionId") ?? ""),
      status,
      score: scoreText ? Number(scoreText) : null,
      comment: String(formData.get("comment") ?? ""),
    });
  } catch (error) {
    if (error instanceof HomeworkError) redirect(historyUrl(returnQuery, "error", error.message));
    throw error;
  }

  revalidatePath("/teacher/homework/history");
  revalidatePath("/student/homework");
  redirect(historyUrl(returnQuery, "success", "Review saved."));
}
