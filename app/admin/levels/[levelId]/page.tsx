import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getLevel } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { LevelForm } from "@/components/admin/level-form";
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
      <Link
        href="/admin/levels"
        className="mb-6 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← All levels
      </Link>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
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
      </section>
    </AppShell>
  );
}
