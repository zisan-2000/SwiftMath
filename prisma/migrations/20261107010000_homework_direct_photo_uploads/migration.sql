-- Additive only. No existing homework/student/photo rows are rewritten.
CREATE TYPE "HomeworkPhotoUploadKind" AS ENUM ('FIRST', 'FINAL');
CREATE TYPE "HomeworkPhotoUploadStatus" AS ENUM ('PENDING', 'FINALIZING', 'FINALIZED', 'EXPIRED');
CREATE TABLE "homework_photo_upload" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "expectationId" TEXT NOT NULL,
  "kind" "HomeworkPhotoUploadKind" NOT NULL,
  "submissionId" TEXT,
  "expectedAttemptNumber" INTEGER NOT NULL,
  "pageNumber" TEXT,
  "pathname" TEXT NOT NULL,
  "storage" TEXT NOT NULL DEFAULT 'blob',
  "byteSize" INTEGER NOT NULL,
  "contentType" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "status" "HomeworkPhotoUploadStatus" NOT NULL DEFAULT 'PENDING',
  "completedSubmissionId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "finalizedAt" TIMESTAMP(3),
  "cleanedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homework_photo_upload_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homework_photo_upload_bytes_check" CHECK ("byteSize" > 0 AND "byteSize" <= 8388608),
  CONSTRAINT "homework_photo_upload_storage_check" CHECK ("storage" IN ('blob', 'local')),
  CONSTRAINT "homework_photo_upload_hash_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "homework_photo_upload_kind_check" CHECK (("kind" = 'FIRST' AND "pageNumber" IS NOT NULL AND "submissionId" IS NULL) OR ("kind" = 'FINAL' AND "submissionId" IS NOT NULL)),
  CONSTRAINT "homework_photo_upload_finalized_check" CHECK ("status" <> 'FINALIZED' OR ("completedSubmissionId" IS NOT NULL AND "finalizedAt" IS NOT NULL)),
  CONSTRAINT "homework_photo_upload_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "homework_photo_upload_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "homework_photo_upload_expectationId_fkey" FOREIGN KEY ("expectationId") REFERENCES "homework_expectation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "homework_photo_upload_pathname_key" ON "homework_photo_upload"("pathname");
CREATE UNIQUE INDEX "homework_photo_upload_studentId_requestId_key" ON "homework_photo_upload"("studentId", "requestId");
CREATE INDEX "homework_photo_upload_instituteId_studentId_status_idx" ON "homework_photo_upload"("instituteId", "studentId", "status");
CREATE INDEX "homework_photo_upload_status_expiresAt_idx" ON "homework_photo_upload"("status", "expiresAt");
