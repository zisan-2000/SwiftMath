"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { parseLevelQuestionForm } from "@/lib/level-question-form";
import {
  createLevelQuestion,
  deleteLevelQuestion,
  importLevelQuestions,
  moveLevelQuestion,
  reorderLevelQuestions,
  setLevelQuestionActive,
  setLevelQuestionStatus,
  updateLevelQuestion,
} from "@/server/question-bank";
import { parseLevelQuestionImportCsv } from "@/lib/level-question-csv";
import { QuestionStatus } from "@/lib/generated/prisma/enums";

export interface LevelQuestionFormState {
  error?: string;
  ok?: boolean;
}

export interface LevelQuestionImportState {
  error?: string;
  rowErrors?: string[];
  created?: number;
  ok?: boolean;
}

function revalidateLevelQuestions(levelId: string) {
  revalidatePath(`/admin/levels/${levelId}/questions`);
  revalidatePath(`/admin/levels/${levelId}`);
  revalidatePath("/admin/activity");
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

/** Bulk import bank questions from an uploaded CSV file. */
export async function importLevelQuestionsCsvAction(
  _prevState: LevelQuestionImportState,
  formData: FormData,
): Promise<LevelQuestionImportState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }

  const text = await file.text();
  const parsed = parseLevelQuestionImportCsv(text);

  if (!parsed.ok) {
    return { error: parsed.error, rowErrors: parsed.rowErrors };
  }

  const result = await importLevelQuestions(admin, levelId, parsed.rows);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  revalidatePath("/teacher");
  return { ok: true, created: result.created };
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

/** Publish a draft bank question into live sessions. */
export async function publishLevelQuestionAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  const result = await setLevelQuestionStatus(
    admin,
    questionId,
    QuestionStatus.PUBLISHED,
  );
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  revalidatePath("/teacher");
  return { ok: true };
}

/** Move a published question back to draft (hidden from sessions). */
export async function unpublishLevelQuestionAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  const result = await setLevelQuestionStatus(
    admin,
    questionId,
    QuestionStatus.DRAFT,
  );
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

/** Save a full drag-sort order for bank questions. */
export async function reorderLevelQuestionsAction(
  levelId: string,
  orderedQuestionIds: string[],
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);

  const result = await reorderLevelQuestions(admin, levelId, orderedQuestionIds);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  return { ok: true };
}

/** Move one bank question up or down. */
export async function moveLevelQuestionAction(
  formData: FormData,
): Promise<LevelQuestionFormState> {
  const admin = await requireRole(Role.ADMIN);
  const levelId = String(formData.get("levelId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const direction = String(formData.get("direction") ?? "");

  if (direction !== "up" && direction !== "down") {
    return { error: "Invalid move direction." };
  }

  const result = await moveLevelQuestion(admin, levelId, questionId, direction);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateLevelQuestions(levelId);
  return { ok: true };
}
