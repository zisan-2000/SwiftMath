"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import {
  startPracticeSession,
  submitPracticeSession,
  type SubmitResult,
} from "@/server/practice";

/**
 * Start a new timed session at the student's current level, then open it.
 * If no level is assigned, bounce back to the practice home.
 */
export async function startSessionAction() {
  const student = await requireRole(Role.STUDENT);

  let sessionId: string;
  try {
    sessionId = await startPracticeSession(student);
  } catch {
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
): Promise<SubmitResult> {
  const student = await requireRole(Role.STUDENT);

  const result = await submitPracticeSession(student, sessionId, answers);

  revalidatePath(`/student/practice/${sessionId}`);
  revalidatePath("/student/practice");
  return result;
}
