import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getLevel } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { LevelForm } from "@/components/admin/level-form";
import { Card, CardContent } from "@/components/ui/card";
import { updateLevelAction } from "../actions";

export const metadata: Metadata = {
  title: `Edit level · ${APP_NAME}`,
};

export default async function EditLevelPage({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const admin = await requireRole(Role.ADMIN);

  // Scoped lookup — null if the level isn't in this admin's institute.
  const [institute, level] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    getLevel(admin, levelId),
  ]);

  if (!level) {
    notFound();
  }

  // Bind the level id so the form's action matches the (prevState, formData)
  // shape useActionState expects.
  const action = updateLevelAction.bind(null, level.id);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title={`Edit: ${level.name}`}
      subtitle="Changes apply to new practice sessions started after saving."
    >
      <BackLink href="/admin/levels">All levels</BackLink>

      <Card>
        <CardContent className="pt-6">
          <LevelForm
            action={action}
            submitLabel="Save changes"
            defaults={{
              name: level.name,
              operation: level.operation,
              orderIndex: level.orderIndex,
              termsPerQuestion: level.termsPerQuestion,
              minNumber: level.minNumber,
              maxNumber: level.maxNumber,
              questionCount: level.questionCount,
              timeLimitSeconds: level.timeLimitSeconds,
              passAccuracy: level.passAccuracy,
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
