// Database seed — SEFT institute + a runnable demo (admin, teacher, group,
// students, levels).
//
// Idempotent and non-destructive: re-running upserts the same records rather
// than wiping data. Run with `npm run db:seed`.
//
// This script runs standalone via tsx, so it cannot use the Next.js `@/` import
// alias or the server-only modules — it builds its own Prisma client (matching
// lib/prisma.ts) and recreates the credential-account shape from
// server/users.ts inline.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../lib/generated/prisma/client";
import { Role } from "../lib/generated/prisma/enums";
import { DEFAULT_STARTER_LEVELS } from "../lib/default-levels";
import { buildStarterQuestionBankRows } from "../lib/default-question-bank";
import { buildFixedExamPaper } from "../lib/exam-paper";
import { filterEnabledBankQuestions } from "../lib/question-bank";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Shared demo password for every seeded account. */
const DEMO_PASSWORD = "Password123!";

/**
 * Upsert a user by email and make sure they have an email/password credential
 * (mirrors server/users.ts so seeded users can sign in). Non-destructive: an
 * existing password is left untouched.
 */
async function ensureUser(params: {
  email: string;
  name: string;
  role: Role;
  instituteId: string;
  groupId?: string | null;
  currentLevelId?: string | null;
}) {
  const { email, name, role, instituteId, groupId, currentLevelId } = params;

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, instituteId, groupId, currentLevelId },
    create: {
      email,
      name,
      role,
      instituteId,
      groupId,
      currentLevelId,
      emailVerified: true,
    },
  });

  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  if (!credential) {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: await hashPassword(DEMO_PASSWORD),
      },
    });
  }

  return user;
}

async function main() {
  // --- Institute (SEFT, the only Phase 1 client) ---
  const seft = await prisma.institute.upsert({
    where: { slug: "seft" },
    update: { name: "SEFT Institute" },
    create: { slug: "seft", name: "SEFT Institute" },
  });

  // --- Levels (starter ADD/SUB/MIXED/MUL/DIV progression, shared with new institutes) ---
  const levelDefs = DEFAULT_STARTER_LEVELS;

  const levels = [];
  for (const def of levelDefs) {
    const level = await prisma.level.upsert({
      where: {
        instituteId_orderIndex: {
          instituteId: seft.id,
          orderIndex: def.orderIndex,
        },
      },
      update: { ...def, instituteId: seft.id },
      create: { ...def, instituteId: seft.id },
    });
    levels.push(level);
  }

  // --- Starter question bank (same fixed prompts as new institutes) ---
  const levelsNeedingBank: Array<{ id: string; orderIndex: number }> = [];
  for (const level of levels) {
    const existingCount = await prisma.levelQuestion.count({
      where: { instituteId: seft.id, levelId: level.id },
    });
    if (existingCount === 0) {
      levelsNeedingBank.push({ id: level.id, orderIndex: level.orderIndex });
    }
  }

  const bankRows = buildStarterQuestionBankRows({
    instituteId: seft.id,
    levels: levelsNeedingBank,
  });
  if (bankRows.length > 0) {
    await prisma.levelQuestion.createMany({ data: bankRows });
  }

  const bankQuestionCount = await prisma.levelQuestion.count({
    where: { instituteId: seft.id },
  });

  // --- Super Admin (platform-level operator, cross-tenant) ---
  // Their `instituteId` is just a home base; their access spans all institutes.
  await ensureUser({
    email: "super@seft.test",
    name: "Platform Super Admin",
    role: Role.SUPER_ADMIN,
    instituteId: seft.id,
  });

  // --- Admin ---
  await ensureUser({
    email: "admin@seft.test",
    name: "SEFT Admin",
    role: Role.ADMIN,
    instituteId: seft.id,
  });

  // --- Teacher ---
  const teacher = await ensureUser({
    email: "teacher@seft.test",
    name: "Demo Teacher",
    role: Role.TEACHER,
    instituteId: seft.id,
  });

  // --- Group (find-or-create; groups have no natural unique key) ---
  let group = await prisma.group.findFirst({
    where: { teacherId: teacher.id, name: "Demo Group A" },
    select: { id: true },
  });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "Demo Group A",
        instituteId: seft.id,
        teacherId: teacher.id,
      },
      select: { id: true },
    });
  }

  // --- Students (placed in the group, with varied starting levels) ---
  const students = [
    { email: "aisha@seft.test", name: "Aisha Rahman", level: levels[2] },
    { email: "bilal@seft.test", name: "Bilal Khan", level: levels[1] },
    { email: "chitra@seft.test", name: "Chitra Das", level: levels[0] },
    { email: "dipu@seft.test", name: "Dipu Roy", level: levels[3] },
  ];
  for (const s of students) {
    await ensureUser({
      email: s.email,
      name: s.name,
      role: Role.STUDENT,
      instituteId: seft.id,
      groupId: group.id,
      currentLevelId: s.level.id,
    });
  }

  // --- Demo scheduled exam (open window for manual 6.7 testing) ---
  const examOpens = new Date(Date.now() - 60 * 60 * 1000);
  const examCloses = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const demoExamLevel = levels[2]!;

  let demoExam = await prisma.scheduledExam.findFirst({
    where: {
      groupId: group.id,
      levelId: demoExamLevel.id,
      title: "Demo weekly exam",
    },
    select: { id: true },
  });
  if (!demoExam) {
    demoExam = await prisma.scheduledExam.create({
      data: {
        instituteId: seft.id,
        groupId: group.id,
        levelId: demoExamLevel.id,
        title: "Demo weekly exam",
        opensAt: examOpens,
        closesAt: examCloses,
        createdById: teacher.id,
      },
      select: { id: true },
    });
  } else {
    await prisma.scheduledExam.update({
      where: { id: demoExam.id },
      data: { opensAt: examOpens, closesAt: examCloses },
    });
  }

  const demoPaperCount = await prisma.scheduledExamQuestion.count({
    where: { scheduledExamId: demoExam.id },
  });
  if (demoPaperCount === 0) {
    const bankRows = await prisma.levelQuestion.findMany({
      where: {
        levelId: demoExamLevel.id,
        instituteId: seft.id,
        isActive: true,
      },
      select: {
        id: true,
        prompt: true,
        correctAnswer: true,
        isActive: true,
      },
    });
    const disabled = await prisma.groupQuestionRule.findMany({
      where: {
        groupId: group.id,
        enabled: false,
        questionId: { in: bankRows.map((q) => q.id) },
      },
      select: { questionId: true },
    });
    const pool = filterEnabledBankQuestions(
      bankRows,
      new Set(disabled.map((r) => r.questionId)),
    );
    const paper = buildFixedExamPaper(
      {
        questionCount: demoExamLevel.questionCount,
        operation: demoExamLevel.operation,
        termsPerQuestion: demoExamLevel.termsPerQuestion,
        minNumber: demoExamLevel.minNumber,
        maxNumber: demoExamLevel.maxNumber,
        bankOnly: demoExamLevel.bankOnly,
      },
      pool,
      demoExam.id,
    );
    await prisma.scheduledExamQuestion.createMany({
      data: paper.map((q, index) => ({
        scheduledExamId: demoExam.id,
        index,
        prompt: q.prompt,
        correctAnswer: q.correctAnswer,
        sourceQuestionId: q.sourceQuestionId,
      })),
    });
  }

  console.log("\n✅ Seed complete.\n");
  console.log(`Institute: ${seft.name} (slug: ${seft.slug})`);
  console.log(`Levels:    ${levels.length}`);
  console.log(`Bank:      ${bankQuestionCount} question(s) across levels`);
  console.log(`Students:  ${students.length} in "Demo Group A"`);
  console.log(`Demo exam: "${demoExamLevel.name}" (open for 7 days — student aisha@seft.test)\n`);
  console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
  console.log("Sign-in emails:");
  console.log("  SUPER    super@seft.test");
  console.log("  ADMIN    admin@seft.test");
  console.log("  TEACHER  teacher@seft.test");
  for (const s of students) console.log(`  STUDENT  ${s.email}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
