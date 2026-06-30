// Trusted institute question bank — Admin owns content, Teacher sets group overrides.

import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import {
  composeSessionQuestions,
  filterEnabledBankQuestions,
  type SessionQuestionDraft,
} from "@/lib/question-bank";
import type { LevelConfig } from "@/lib/practice-logic";
import { QuestionDifficulty } from "@/lib/generated/prisma/enums";
import type { AdminContext } from "@/server/admin";
import type { TeacherContext } from "@/server/teacher";

export interface LevelQuestionInput {
  prompt: string;
  correctAnswer: number;
  category?: string | null;
  difficulty?: QuestionDifficulty;
}

async function assertAdminOwnsLevel(admin: AdminContext, levelId: string) {
  const level = await prisma.level.findFirst({
    where: {
      id: levelId,
      instituteId: admin.instituteId,
      ...ACTIVE_LEVEL_FILTER,
    },
    select: { id: true },
  });
  if (!level) {
    throw new Error("Level not found.");
  }
  return level;
}

/** List bank questions for a level (Admin). */
export function listLevelQuestions(admin: AdminContext, levelId: string) {
  return prisma.levelQuestion.findMany({
    where: { levelId, instituteId: admin.instituteId },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      prompt: true,
      correctAnswer: true,
      category: true,
      difficulty: true,
      isActive: true,
      orderIndex: true,
      createdAt: true,
    },
  });
}

/** Add a question to the institute bank for one level. */
export async function createLevelQuestion(
  admin: AdminContext,
  levelId: string,
  input: LevelQuestionInput,
) {
  await assertAdminOwnsLevel(admin, levelId);

  const maxOrder = await prisma.levelQuestion.aggregate({
    where: { levelId, instituteId: admin.instituteId },
    _max: { orderIndex: true },
  });

  return prisma.levelQuestion.create({
    data: {
      instituteId: admin.instituteId,
      levelId,
      prompt: input.prompt.trim(),
      correctAnswer: input.correctAnswer,
      category: input.category?.trim() || null,
      difficulty: input.difficulty ?? QuestionDifficulty.MEDIUM,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
    select: { id: true },
  });
}

export type MutateLevelQuestionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Toggle institute-wide active flag (Admin). */
export async function setLevelQuestionActive(
  admin: AdminContext,
  questionId: string,
  isActive: boolean,
): Promise<MutateLevelQuestionResult> {
  const result = await prisma.levelQuestion.updateMany({
    where: { id: questionId, instituteId: admin.instituteId },
    data: { isActive },
  });
  if (result.count === 0) {
    return { ok: false, error: "Question not found." };
  }
  return { ok: true };
}

/** Delete a bank question (Admin). Group rules cascade via FK. */
export async function deleteLevelQuestion(
  admin: AdminContext,
  questionId: string,
): Promise<MutateLevelQuestionResult> {
  const result = await prisma.levelQuestion.deleteMany({
    where: { id: questionId, instituteId: admin.instituteId },
  });
  if (result.count === 0) {
    return { ok: false, error: "Question not found." };
  }
  return { ok: true };
}

/** Update an existing bank question (Admin). */
export async function updateLevelQuestion(
  admin: AdminContext,
  levelId: string,
  questionId: string,
  input: LevelQuestionInput,
): Promise<MutateLevelQuestionResult> {
  await assertAdminOwnsLevel(admin, levelId);

  const result = await prisma.levelQuestion.updateMany({
    where: {
      id: questionId,
      levelId,
      instituteId: admin.instituteId,
    },
    data: {
      prompt: input.prompt.trim(),
      correctAnswer: input.correctAnswer,
      category: input.category?.trim() || null,
      difficulty: input.difficulty ?? QuestionDifficulty.MEDIUM,
    },
  });

  if (result.count === 0) {
    return { ok: false, error: "Question not found." };
  }
  return { ok: true };
}

export interface LevelBankStats {
  totalBankCount: number;
  activeBankCount: number;
}

/** Count bank rows for admin coverage warnings. */
export async function getLevelBankStats(
  admin: AdminContext,
  levelId: string,
): Promise<LevelBankStats | null> {
  const level = await prisma.level.findFirst({
    where: { id: levelId, instituteId: admin.instituteId },
    select: { id: true },
  });
  if (!level) return null;

  const [totalBankCount, activeBankCount] = await Promise.all([
    prisma.levelQuestion.count({
      where: { levelId, instituteId: admin.instituteId },
    }),
    prisma.levelQuestion.count({
      where: { levelId, instituteId: admin.instituteId, isActive: true },
    }),
  ]);

  return { totalBankCount, activeBankCount };
}

export type ImportLevelQuestionsResult =
  | { ok: true; created: number }
  | { ok: false; error: string };

/** Bulk-create bank questions from a validated import batch. */
export async function importLevelQuestions(
  admin: AdminContext,
  levelId: string,
  inputs: LevelQuestionInput[],
): Promise<ImportLevelQuestionsResult> {
  await assertAdminOwnsLevel(admin, levelId);

  if (inputs.length === 0) {
    return { ok: false, error: "No questions to import." };
  }

  const maxOrder = await prisma.levelQuestion.aggregate({
    where: { levelId, instituteId: admin.instituteId },
    _max: { orderIndex: true },
  });

  let orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  await prisma.$transaction(async (tx) => {
    for (const input of inputs) {
      await tx.levelQuestion.create({
        data: {
          instituteId: admin.instituteId,
          levelId,
          prompt: input.prompt.trim(),
          correctAnswer: input.correctAnswer,
          category: input.category?.trim() || null,
          difficulty: input.difficulty ?? QuestionDifficulty.MEDIUM,
          orderIndex: orderIndex++,
        },
      });
    }
  });

  return { ok: true, created: inputs.length };
}

export interface GroupQuestionOverrideRow {
  id: string;
  prompt: string;
  correctAnswer: number;
  category: string | null;
  difficulty: QuestionDifficulty;
  instituteActive: boolean;
  groupEnabled: boolean;
  effectiveEnabled: boolean;
}

/** Bank rows with effective enable state for a teacher group + level. */
export async function listGroupQuestionOverrides(
  teacher: TeacherContext,
  groupId: string,
  levelId: string,
): Promise<GroupQuestionOverrideRow[] | null> {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
    select: { id: true },
  });
  if (!group) return null;

  const level = await prisma.level.findFirst({
    where: {
      id: levelId,
      instituteId: teacher.instituteId,
      ...ACTIVE_LEVEL_FILTER,
    },
    select: { id: true },
  });
  if (!level) return null;

  const [questions, rules] = await Promise.all([
    prisma.levelQuestion.findMany({
      where: { levelId, instituteId: teacher.instituteId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        prompt: true,
        correctAnswer: true,
        category: true,
        difficulty: true,
        isActive: true,
      },
    }),
    prisma.groupQuestionRule.findMany({
      where: { groupId, question: { levelId } },
      select: { questionId: true, enabled: true },
    }),
  ]);

  const ruleByQuestion = new Map(
    rules.map((r) => [r.questionId, r.enabled] as const),
  );

  return questions.map((q) => {
    const groupEnabled = ruleByQuestion.get(q.id) ?? true;
    const effectiveEnabled = q.isActive && groupEnabled;
    return {
      id: q.id,
      prompt: q.prompt,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: q.difficulty,
      instituteActive: q.isActive,
      groupEnabled,
      effectiveEnabled,
    };
  });
}

/** Teacher enable/disable for one question in their group. */
export async function setGroupQuestionEnabled(
  teacher: TeacherContext,
  groupId: string,
  questionId: string,
  enabled: boolean,
): Promise<MutateLevelQuestionResult> {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
    select: { id: true },
  });
  if (!group) {
    return { ok: false, error: "Group not found." };
  }

  const question = await prisma.levelQuestion.findFirst({
    where: { id: questionId, instituteId: teacher.instituteId },
    select: { id: true },
  });
  if (!question) {
    return { ok: false, error: "Question not found." };
  }

  await prisma.groupQuestionRule.upsert({
    where: {
      groupId_questionId: { groupId, questionId },
    },
    create: { groupId, questionId, enabled },
    update: { enabled },
  });

  return { ok: true };
}

/** Build trusted session questions for a student (bank + optional dynamic fallback). */
export async function buildSessionQuestionsForStudent(input: {
  instituteId: string;
  studentId: string;
  level: LevelConfig & {
    id: string;
    questionCount: number;
    bankOnly?: boolean;
  };
}): Promise<SessionQuestionDraft[]> {
  const [student, bankRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.studentId },
      select: { groupId: true },
    }),
    prisma.levelQuestion.findMany({
      where: {
        levelId: input.level.id,
        instituteId: input.instituteId,
        isActive: true,
      },
      select: {
        id: true,
        prompt: true,
        correctAnswer: true,
        isActive: true,
      },
    }),
  ]);

  let disabledIds = new Set<string>();
  if (student?.groupId && bankRows.length > 0) {
    const disabled = await prisma.groupQuestionRule.findMany({
      where: {
        groupId: student.groupId,
        enabled: false,
        questionId: { in: bankRows.map((q) => q.id) },
      },
      select: { questionId: true },
    });
    disabledIds = new Set(disabled.map((r) => r.questionId));
  }

  const pool = filterEnabledBankQuestions(bankRows, disabledIds);

  return composeSessionQuestions(
    input.level,
    input.level.questionCount,
    pool,
    { bankOnly: input.level.bankOnly ?? false },
  );
}
