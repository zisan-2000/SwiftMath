-- RBAC Phase 2: persistent per-user permission overrides.

ALTER TYPE "AuditAction" ADD VALUE 'PERMISSION_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'PERMISSION_REVOKED';

CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

CREATE TABLE "user_permission" (
  "userId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "effect" "PermissionEffect" NOT NULL,
  "grantedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_permission_pkey" PRIMARY KEY ("userId", "permission")
);

CREATE INDEX "user_permission_grantedById_idx" ON "user_permission"("grantedById");

ALTER TABLE "user_permission"
  ADD CONSTRAINT "user_permission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permission"
  ADD CONSTRAINT "user_permission_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
