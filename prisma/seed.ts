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
import { Role, OperationType } from "../lib/generated/prisma/enums";

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

  // --- Levels (a small ADD/SUB/MIXED progression) ---
  const levelDefs = [
    {
      orderIndex: 1,
      name: "Addition I",
      operation: OperationType.ADDITION,
      termsPerQuestion: 2,
      minNumber: 1,
      maxNumber: 9,
      questionCount: 10,
      timeLimitSeconds: 120,
      passAccuracy: 70,
    },
    {
      orderIndex: 2,
      name: "Addition II",
      operation: OperationType.ADDITION,
      termsPerQuestion: 3,
      minNumber: 1,
      maxNumber: 9,
      questionCount: 10,
      timeLimitSeconds: 120,
      passAccuracy: 75,
    },
    {
      orderIndex: 3,
      name: "Addition III",
      operation: OperationType.ADDITION,
      termsPerQuestion: 3,
      minNumber: 10,
      maxNumber: 99,
      questionCount: 10,
      timeLimitSeconds: 180,
      passAccuracy: 75,
    },
    {
      orderIndex: 4,
      name: "Subtraction I",
      operation: OperationType.SUBTRACTION,
      termsPerQuestion: 2,
      minNumber: 1,
      maxNumber: 20,
      questionCount: 10,
      timeLimitSeconds: 120,
      passAccuracy: 70,
    },
    {
      orderIndex: 5,
      name: "Mixed I",
      operation: OperationType.MIXED,
      termsPerQuestion: 3,
      minNumber: 1,
      maxNumber: 20,
      questionCount: 10,
      timeLimitSeconds: 180,
      passAccuracy: 70,
    },
  ];

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

  console.log("\n✅ Seed complete.\n");
  console.log(`Institute: ${seft.name} (slug: ${seft.slug})`);
  console.log(`Levels:    ${levels.length}`);
  console.log(`Students:  ${students.length} in "Demo Group A"\n`);
  console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
  console.log("Sign-in emails:");
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
