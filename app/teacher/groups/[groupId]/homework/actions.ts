"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { HomeworkScheduleMode, HomeworkScheduleStatus, HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";
import { parseDateOnly, parseDhakaLocalDateTime, parseTimeToMinute } from "@/lib/homework-schedule";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { createHomeworkSchedule, HomeworkError, reviewHomeworkSubmission, setHomeworkScheduleStatus } from "@/server/homework";

function back(groupId: string, message: string, ok = false) {
  return `/teacher/groups/${groupId}/homework?${ok ? "success" : "error"}=${encodeURIComponent(message)}`;
}

export async function createHomeworkAction(formData: FormData) {
  const teacher = await requirePermission(PERMISSIONS.HOMEWORK_MANAGE);
  const groupId = String(formData.get("groupId") ?? "");
  const mode = formData.get("mode") === HomeworkScheduleMode.MANUAL_SPECIFIC
    ? HomeworkScheduleMode.MANUAL_SPECIFIC : HomeworkScheduleMode.WEEKLY_RECURRING;
  try {
    const startDate = parseDateOnly(String(formData.get("startDate") ?? ""));
    const endValue = String(formData.get("endDate") ?? "");
    const endDate = endValue ? parseDateOnly(endValue) : null;
    if (!startDate || (endValue && !endDate)) throw new HomeworkError("Choose valid schedule dates.");
    const openMinute = parseTimeToMinute(String(formData.get("openTime") ?? ""));
    const dueMinute = parseTimeToMinute(String(formData.get("dueTime") ?? ""));
    const weekdays = formData.getAll("weekdays").map(Number);
    const slots = openMinute === null || dueMinute === null ? [] : weekdays.map((dayOfWeek) => ({ dayOfWeek, openMinute, dueMinute }));

    await createHomeworkSchedule(teacher, {
      groupId,
      targetStudentId: String(formData.get("targetStudentId") ?? "") || null,
      title: String(formData.get("title") ?? ""),
      mode,
      startDate,
      endDate,
      manualOpensAt: parseDhakaLocalDateTime(String(formData.get("manualOpensAt") ?? "")),
      manualDueAt: parseDhakaLocalDateTime(String(formData.get("manualDueAt") ?? "")),
      slots,
      maxScore: Number(formData.get("maxScore")),
      timeLimitMinutes: Number(formData.get("timeLimitMinutes")),
      showTimer: formData.get("showTimer") === "on",
      allowSamePageAgain: formData.get("allowSamePageAgain") === "on",
    });
  } catch (error) {
    if (error instanceof HomeworkError) redirect(back(groupId, error.message));
    throw error;
  }
  revalidatePath(`/teacher/groups/${groupId}/homework`);
  revalidatePath("/student/homework");
  redirect(back(groupId, "Homework schedule created.", true));
}

export async function setHomeworkScheduleStatusAction(formData: FormData) {
  const teacher = await requirePermission(PERMISSIONS.HOMEWORK_MANAGE);
  const groupId = String(formData.get("groupId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const status = Object.values(HomeworkScheduleStatus).includes(statusRaw as HomeworkScheduleStatus)
    ? statusRaw as HomeworkScheduleStatus : HomeworkScheduleStatus.PAUSED;
  try {
    await setHomeworkScheduleStatus(teacher, String(formData.get("scheduleId") ?? ""), status);
  } catch (error) {
    if (error instanceof HomeworkError) redirect(back(groupId, error.message));
    throw error;
  }
  revalidatePath(`/teacher/groups/${groupId}/homework`);
  redirect(back(groupId, "Schedule status updated.", true));
}

export async function reviewHomeworkAction(formData: FormData) {
  const teacher = await requirePermission(PERMISSIONS.HOMEWORK_MANAGE);
  const groupId = String(formData.get("groupId") ?? "");
  const occurrenceId = String(formData.get("occurrenceId") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const status = Object.values(HomeworkSubmissionStatus).includes(rawStatus as HomeworkSubmissionStatus)
    ? rawStatus as HomeworkSubmissionStatus : HomeworkSubmissionStatus.REJECTED;
  const scoreText = String(formData.get("score") ?? "").trim();
  try {
    await reviewHomeworkSubmission(teacher, {
      submissionId: String(formData.get("submissionId") ?? ""),
      status,
      score: scoreText ? Number(scoreText) : null,
      comment: String(formData.get("comment") ?? ""),
    });
  } catch (error) {
    if (error instanceof HomeworkError) redirect(`/teacher/groups/${groupId}/homework/${occurrenceId}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath(`/teacher/groups/${groupId}/homework/${occurrenceId}`);
  revalidatePath("/student/homework");
  redirect(`/teacher/groups/${groupId}/homework/${occurrenceId}?success=${encodeURIComponent("Review saved.")}`);
}
