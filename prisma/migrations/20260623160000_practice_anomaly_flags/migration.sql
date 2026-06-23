-- AlterTable
ALTER TABLE "practice_session" ADD COLUMN "anomalyFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];
