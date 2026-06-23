"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/session";
import { PracticeMode, Role } from "@/lib/generated/prisma/enums";
import {
  startPracticeSession,
  submitPracticeSession,
  type PracticeSubmitTelemetry,
  type SubmitResult,
} from "@/server/practice";
import { LevelAccessError } from "@/server/level-access";

/** Parse the optional mode field from a start-practice form. */
function parsePracticeMode(formData: FormData): PracticeMode {
  return formData.get("mode") === "review"
    ? PracticeMode.REVIEW
    : PracticeMode.STANDARD;
}

/**
 * Start a new session at the student's current level, then open it.
 * Hidden input `mode=review` starts an untimed review drill.
 */
export async function startSessionAction(formData: FormData) {
  const student = await requireRole(Role.STUDENT);
  const mode = parsePracticeMode(formData);

  let sessionId: string;
  try {
    sessionId = await startPracticeSession(student, mode);
  } catch (error) {
    if (error instanceof LevelAccessError) {
      redirect("/student/practice?locked=1");
    }
    redirect("/student/practice");
  }

  redirect(`/student/practice/${sessionId}`);
}

/**
 * Grade a submission. Called directly from the client runner. The server owns
 * all timing/scoring; the only thing trusted from the client is the raw answers.
 */
export async function submitSessionAction(
  sessionId: string,
  answers: { id: string; answer: number | null }[],
  telemetry: PracticeSubmitTelemetry = {},
): Promise<SubmitResult> {
  const student = await requireRole(Role.STUDENT);

  const result = await submitPracticeSession(
    student,
    sessionId,
    answers,
    telemetry,
  );

  revalidatePath(`/student/practice/${sessionId}`);
  revalidatePath("/student/practice");
  return result;
}
