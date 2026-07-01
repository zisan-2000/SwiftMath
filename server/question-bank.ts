// Trusted institute question bank — Admin owns content, Teacher sets group overrides.

import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import {
  composeSessionQuestions,
  filterEnabledBankQuestions,
  type SessionQuestionDraft,
} from "@/lib/question-bank";
import {
  applyMoveInOrder,
  buildOrderIndexUpdates,
} from "@/lib/level-question-order";
import type { LevelConfig } from "@/lib/practice-logic";
import { AuditAction, QuestionDifficulty, QuestionStatus } from "@/lib/generated/prisma/enums";
import { truncateAuditPrompt } from "@/lib/audit-log";
import type { AdminContext } from "@/server/admin";
import type { TeacherContext } from "@/server/teacher";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getActiveCurriculumVersionId } from "@/server/curriculum-version";
import {
  auditActorFromAdmin,
  auditActorFromTeacher,
  recordAuditLog,
} from "@/server/audit-log";
import { notifyAdminsGroupQuestionDisabled } from "@/server/notifications";

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

async function loadLevelAuditContext(levelId: string, instituteId: string) {
  return prisma.level.findFirst({
    where: { id: levelId, instituteId },
    select: { id: true, name: true },
  });
}

async function loadQuestionAuditContext(questionId: string, instituteId: string) {
  return prisma.levelQuestion.findFirst({
    where: { id: questionId, instituteId },
    select: {
      id: true,
      prompt: true,
      levelId: true,
      level: { select: { name: true } },
    },
  });
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
      status: true,
      isActive: true,
      orderIndex: true,
      createdAt: true,
      curriculumVersion: { select: { versionNumber: true } },
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

  const created = await prisma.levelQuestion.create({
    data: {
      instituteId: admin.instituteId,
      levelId,
      prompt: input.prompt.trim(),
      correctAnswer: input.correctAnswer,
      category: input.category?.trim() || null,
      difficulty: input.difficulty ?? QuestionDifficulty.MEDIUM,
      status: QuestionStatus.DRAFT,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
    select: { id: true },
  });

  const level = await loadLevelAuditContext(levelId, admin.instituteId);
  const prompt = truncateAuditPrompt(input.prompt);
  await recordAuditLog({
    actor: auditActorFromAdmin(admin),
    action: AuditAction.QUESTION_CREATED,
    targetType: "LevelQuestion",
    targetId: created.id,
    summary: `Added bank question "${prompt}" to ${level?.name ?? "level"}`,
    metadata: {
      levelId,
      levelName: level?.name ?? null,
      prompt,
    },
  });

  return created;
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

  const question = await loadQuestionAuditContext(questionId, admin.instituteId);
  if (question) {
    const prompt = truncateAuditPrompt(question.prompt);
    await recordAuditLog({
      actor: auditActorFromAdmin(admin),
      action: isActive ? AuditAction.QUESTION_ENABLED : AuditAction.QUESTION_DISABLED,
      targetType: "LevelQuestion",
      targetId: questionId,
      summary: `${isActive ? "Enabled" : "Disabled"} "${prompt}" institute-wide on ${question.level.name}`,
      metadata: {
        levelId: question.levelId,
        levelName: question.level.name,
        prompt,
        isActive,
      },
    });
  }

  return { ok: true };
}

/** Publish a draft question or move a live question back to draft. */
export async function setLevelQuestionStatus(
  admin: AdminContext,
  questionId: string,
  status: QuestionStatus,
): Promise<MutateLevelQuestionResult> {
  const curriculumVersionId =
    status === QuestionStatus.PUBLISHED
      ? await getActiveCurriculumVersionId(admin.instituteId)
      : null;

  const result = await prisma.levelQuestion.updateMany({
    where: { id: questionId, instituteId: admin.instituteId },
    data: { status, curriculumVersionId },
  });
  if (result.count === 0) {
    return { ok: false, error: "Question not found." };
  }

  const question = await loadQuestionAuditContext(questionId, admin.instituteId);
  if (question) {
    const prompt = truncateAuditPrompt(question.prompt);
    const published = status === QuestionStatus.PUBLISHED;
    await recordAuditLog({
      actor: auditActorFromAdmin(admin),
      action: published
        ? AuditAction.QUESTION_PUBLISHED
        : AuditAction.QUESTION_UNPUBLISHED,
      targetType: "LevelQuestion",
      targetId: questionId,
      summary: `${published ? "Published" : "Moved to draft"} "${prompt}" on ${question.level.name}`,
      metadata: {
        levelId: question.levelId,
        levelName: question.level.name,
        prompt,
        status,
      },
    });
  }

  return { ok: true };
}

/** Delete a bank question (Admin). Group rules cascade via FK. */
export async function deleteLevelQuestion(
  admin: AdminContext,
  questionId: string,
): Promise<MutateLevelQuestionResult> {
  const question = await loadQuestionAuditContext(questionId, admin.instituteId);
  if (!question) {
    return { ok: false, error: "Question not found." };
  }

  const result = await prisma.levelQuestion.deleteMany({
    where: { id: questionId, instituteId: admin.instituteId },
  });
  if (result.count === 0) {
    return { ok: false, error: "Question not found." };
  }

  const prompt = truncateAuditPrompt(question.prompt);
  await recordAuditLog({
    actor: auditActorFromAdmin(admin),
    action: AuditAction.QUESTION_DELETED,
    targetType: "LevelQuestion",
    targetId: questionId,
    summary: `Deleted "${prompt}" from ${question.level.name}`,
    metadata: {
      levelId: question.levelId,
      levelName: question.level.name,
      prompt,
    },
  });

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

  const prompt = truncateAuditPrompt(input.prompt);
  const level = await loadLevelAuditContext(levelId, admin.instituteId);
  await recordAuditLog({
    actor: auditActorFromAdmin(admin),
    action: AuditAction.QUESTION_UPDATED,
    targetType: "LevelQuestion",
    targetId: questionId,
    summary: `Updated "${prompt}" on ${level?.name ?? "level"}`,
    metadata: {
      levelId,
      levelName: level?.name ?? null,
      prompt,
    },
  });

  return { ok: true };
}
export async function reorderLevelQuestions(
  admin: AdminContext,
  levelId: string,
  orderedQuestionIds: string[],
): Promise<MutateLevelQuestionResult> {
  await assertAdminOwnsLevel(admin, levelId);

  const existing = await prisma.levelQuestion.findMany({
    where: { levelId, instituteId: admin.instituteId },
    select: { id: true },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });

  if (orderedQuestionIds.length !== existing.length) {
    return { ok: false, error: "Invalid question order." };
  }

  const existingIds = new Set(existing.map((row) => row.id));
  if (new Set(orderedQuestionIds).size !== orderedQuestionIds.length) {
    return { ok: false, error: "Invalid question order." };
  }
  if (!orderedQuestionIds.every((id) => existingIds.has(id))) {
    return { ok: false, error: "Invalid question order." };
  }

  const updates = buildOrderIndexUpdates(orderedQuestionIds);
  await prisma.$transaction(
    updates.map(({ id, orderIndex }) =>
      prisma.levelQuestion.updateMany({
        where: { id, levelId, instituteId: admin.instituteId },
        data: { orderIndex },
      }),
    ),
  );

  const level = await loadLevelAuditContext(levelId, admin.instituteId);
  await recordAuditLog({
    actor: auditActorFromAdmin(admin),
    action: AuditAction.QUESTIONS_REORDERED,
    targetType: "Level",
    targetId: levelId,
    summary: `Reordered ${orderedQuestionIds.length} bank questions on ${level?.name ?? "level"}`,
    metadata: {
      levelId,
      levelName: level?.name ?? null,
      questionCount: orderedQuestionIds.length,
    },
  });

  return { ok: true };
}

/** Move one bank question up or down in the admin list. */
export async function moveLevelQuestion(
  admin: AdminContext,
  levelId: string,
  questionId: string,
  direction: "up" | "down",
): Promise<MutateLevelQuestionResult> {
  await assertAdminOwnsLevel(admin, levelId);

  const existing = await prisma.levelQuestion.findMany({
    where: { levelId, instituteId: admin.instituteId },
    select: { id: true },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });

  const orderedIds = existing.map((row) => row.id);
  const nextOrder = applyMoveInOrder(orderedIds, questionId, direction);
  if (!nextOrder) {
    return { ok: false, error: "Cannot move question." };
  }

  return reorderLevelQuestions(admin, levelId, nextOrder);
}

export interface LevelBankStats {
  totalBankCount: number;
  activeBankCount: number;
  draftBankCount: number;
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

  const curriculumVersionId = await getActiveCurriculumVersionId(
    admin.instituteId,
  );

  const [totalBankCount, activeBankCount, draftBankCount] = await Promise.all([
    prisma.levelQuestion.count({
      where: { levelId, instituteId: admin.instituteId },
    }),
    prisma.levelQuestion.count({
      where: {
        levelId,
        instituteId: admin.instituteId,
        status: QuestionStatus.PUBLISHED,
        isActive: true,
        curriculumVersionId,
      },
    }),
    prisma.levelQuestion.count({
      where: {
        levelId,
        instituteId: admin.instituteId,
        status: QuestionStatus.DRAFT,
      },
    }),
  ]);

  return { totalBankCount, activeBankCount, draftBankCount };
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
          status: QuestionStatus.DRAFT,
          orderIndex: orderIndex++,
        },
      });
    }
  });

  const level = await loadLevelAuditContext(levelId, admin.instituteId);
  await recordAuditLog({
    actor: auditActorFromAdmin(admin),
    action: AuditAction.QUESTIONS_IMPORTED,
    targetType: "Level",
    targetId: levelId,
    summary: `Imported ${inputs.length} bank questions into ${level?.name ?? "level"}`,
    metadata: {
      levelId,
      levelName: level?.name ?? null,
      created: inputs.length,
    },
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
      where: {
        levelId,
        instituteId: teacher.instituteId,
        status: QuestionStatus.PUBLISHED,
      },
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
  const [group, question] = await Promise.all([
    prisma.group.findFirst({
      where: {
        id: groupId,
        teacherId: teacher.id,
        instituteId: teacher.instituteId,
      },
      select: { id: true, name: true },
    }),
    prisma.levelQuestion.findFirst({
      where: { id: questionId, instituteId: teacher.instituteId },
      select: {
        id: true,
        prompt: true,
        level: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!group) {
    return { ok: false, error: "Group not found." };
  }
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

  const prompt = truncateAuditPrompt(question.prompt);
  await recordAuditLog({
    actor: auditActorFromTeacher(teacher),
    action: enabled
      ? AuditAction.GROUP_QUESTION_ENABLED
      : AuditAction.GROUP_QUESTION_DISABLED,
    targetType: "GroupQuestionRule",
    targetId: questionId,
    summary: `${enabled ? "Enabled" : "Disabled"} "${prompt}" for group ${group.name} (${question.level.name})`,
    metadata: {
      groupId,
      groupName: group.name,
      levelId: question.level.id,
      levelName: question.level.name,
      questionId,
      prompt,
      enabled,
    },
  });

  if (!enabled) {
    const teacherUser = await prisma.user.findUnique({
      where: { id: teacher.id },
      select: { name: true },
    });
    await notifyAdminsGroupQuestionDisabled({
      instituteId: teacher.instituteId,
      teacherName: teacherUser?.name ?? "A teacher",
      groupName: group.name,
      levelName: question.level.name,
      prompt,
    });
  }

  return { ok: true };
}

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Group-scoped bank pool for exams (respects teacher disable rules). */
export async function loadGroupBankPoolForExam(
  db: DbClient,
  input: {
    instituteId: string;
    groupId: string;
    levelId: string;
    curriculumVersionId: string;
  },
) {
  const bankRows = await db.levelQuestion.findMany({
    where: {
      levelId: input.levelId,
      instituteId: input.instituteId,
      isActive: true,
      status: QuestionStatus.PUBLISHED,
      curriculumVersionId: input.curriculumVersionId,
    },
    select: {
      id: true,
      prompt: true,
      correctAnswer: true,
      isActive: true,
      status: true,
    },
  });

  const disabled = await db.groupQuestionRule.findMany({
    where: {
      groupId: input.groupId,
      enabled: false,
      questionId: { in: bankRows.map((q) => q.id) },
    },
    select: { questionId: true },
  });

  return filterEnabledBankQuestions(
    bankRows,
    new Set(disabled.map((r) => r.questionId)),
  );
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
  const curriculumVersionId = await getActiveCurriculumVersionId(
    input.instituteId,
  );

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
        status: QuestionStatus.PUBLISHED,
        curriculumVersionId,
      },
      select: {
        id: true,
        prompt: true,
        correctAnswer: true,
        isActive: true,
        status: true,
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
