CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "disabledAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription"("userId");
CREATE INDEX "push_subscription_instituteId_idx" ON "push_subscription"("instituteId");

ALTER TABLE "push_subscription"
  ADD CONSTRAINT "push_subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_subscription"
  ADD CONSTRAINT "push_subscription_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
