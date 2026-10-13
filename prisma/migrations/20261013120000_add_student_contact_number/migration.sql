-- Optional staff-managed contact number for student rosters and search.
-- Nullable keeps every existing account valid during deployment.
ALTER TABLE "user" ADD COLUMN "contactNumber" TEXT;

CREATE INDEX "user_instituteId_contactNumber_idx"
ON "user"("instituteId", "contactNumber");
