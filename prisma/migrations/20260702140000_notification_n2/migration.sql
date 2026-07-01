-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXAM_OPEN';
ALTER TYPE "NotificationType" ADD VALUE 'LEVEL_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_JOINED_GROUP';
ALTER TYPE "NotificationType" ADD VALUE 'BANK_PARTIAL_WARNING';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN "dedupeKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notification_userId_dedupeKey_key" ON "notification"("userId", "dedupeKey");
