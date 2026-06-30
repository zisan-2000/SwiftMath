-- CreateTable
CREATE TABLE "scheduled_exam_question" (
    "id" TEXT NOT NULL,
    "scheduledExamId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "sourceQuestionId" TEXT,

    CONSTRAINT "scheduled_exam_question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_exam_question_scheduledExamId_idx" ON "scheduled_exam_question"("scheduledExamId");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_exam_question_scheduledExamId_index_key" ON "scheduled_exam_question"("scheduledExamId", "index");

-- AddForeignKey
ALTER TABLE "scheduled_exam_question" ADD CONSTRAINT "scheduled_exam_question_scheduledExamId_fkey" FOREIGN KEY ("scheduledExamId") REFERENCES "scheduled_exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exam_question" ADD CONSTRAINT "scheduled_exam_question_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "level_question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
