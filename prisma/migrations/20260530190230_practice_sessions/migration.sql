-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "practice_session" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "leveledUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_question" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "studentAnswer" INTEGER,
    "isCorrect" BOOLEAN,

    CONSTRAINT "practice_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_session_studentId_idx" ON "practice_session"("studentId");

-- CreateIndex
CREATE INDEX "practice_session_instituteId_idx" ON "practice_session"("instituteId");

-- CreateIndex
CREATE INDEX "practice_session_levelId_idx" ON "practice_session"("levelId");

-- CreateIndex
CREATE INDEX "practice_question_sessionId_idx" ON "practice_question"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_question_sessionId_index_key" ON "practice_question"("sessionId", "index");

-- AddForeignKey
ALTER TABLE "practice_session" ADD CONSTRAINT "practice_session_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session" ADD CONSTRAINT "practice_session_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session" ADD CONSTRAINT "practice_session_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question" ADD CONSTRAINT "practice_question_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "practice_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
