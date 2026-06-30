"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { parseLevelQuestionForm } from "@/lib/level-question-form";
import {
  createLevelQuestion,
  deleteLevelQuestion,
  setLevelQuestionActive,
  updateLevelQuestion,
} from "@/server/question-bank";

export interface LevelQuestionFormState {
  error?: string;
  ok?: boolean;
}

function revalidateLevelQuestions(levelId: string) {
  revalidatePath(`/admin/levels/${levelId}/questions`);
  revalidatePath(`/admin/levels/${levelId}`);
}

/** Add a bank question to a level (Institute Admin). */
export async function addLevelQuestionAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");

  const parsed = parseLevelQuestionForm({
    prompt: String(formData.get("prompt") ?? ""),
    correctAnswerRaw: String(formData.get("correctAnswer") ?? ""),
    category: String(formData.get("category") ?? ""),
    difficultyRaw: String(formData.get("difficulty") ?? "MEDIUM"),
  });

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  try {
    await createLevelQuestion(admin, levelId, parsed.data);
  } catch {
    return { error: "Level not found." };
  }

  revalidateLevelQuestions(levelId);
  return { ok: true };
}

/** Update an existing bank question (Institute Admin). */
export async function updateLevelQuestionAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  const parsed = parseLevelQuestionForm({
    prompt: String(formData.get("prompt") ?? ""),
    correctAnswerRaw: String(formData.get("correctAnswer") ?? ""),
    category: String(formData.get("category") ?? ""),
    difficultyRaw: String(formData.get("difficulty") ?? "MEDIUM"),
  });

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const result = await updateLevelQuestion(
    admin,
    levelId,
    questionId,
    parsed.data,
  );
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  revalidatePath("/teacher");
  return { ok: true };
}

/** Toggle institute-wide active flag. */
export async function toggleLevelQuestionActiveAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const isActive = formData.get("isActive") === "true";

  const result = await setLevelQuestionActive(admin, questionId, isActive);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  revalidatePath("/teacher");
  return { ok: true };
}

/** Remove a question from the bank. */
export async function deleteLevelQuestionAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  const result = await deleteLevelQuestion(admin, questionId);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  revalidatePath("/teacher");
  return { ok: true };
}
