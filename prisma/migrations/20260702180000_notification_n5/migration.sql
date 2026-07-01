-- N5: notification metadata, actor attribution, exam cancelled type

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXAM_CANCELLED';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN "metadata" JSONB;
ALTER TABLE "notification" ADD COLUMN "actorUserId" TEXT;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "notification_actorUserId_idx" ON "notification"("actorUserId");
