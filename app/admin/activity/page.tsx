import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { parseAuditActionFilter } from "@/lib/audit-log";
import { parsePageParam } from "@/lib/pagination";
import { listInstituteAuditLogs } from "@/server/audit-log";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { ActivityLogPanel } from "@/components/admin/activity-log-panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Activity log",
};

const LIST_PATH = "/admin/activity";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const admin = await requireRole(Role.ADMIN);
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const actionFilter = parseAuditActionFilter(params.action);

  const [institute, activity] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listInstituteAuditLogs(admin, { page, action: actionFilter }),
  ]);

  if (page > activity.totalPages && activity.total > 0) {
    const qs = new URLSearchParams();
    if (activity.totalPages > 1) qs.set("page", String(activity.totalPages));
    if (actionFilter) qs.set("action", actionFilter);
    const suffix = qs.toString();
    redirect(suffix ? `${LIST_PATH}?${suffix}` : LIST_PATH);
  }

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Activity log"
      subtitle="Who changed your question bank, curriculum version, and group overrides."
    >
      <BackLink href="/admin">Back to dashboard</BackLink>

      <p className="mt-6 text-sm text-muted-foreground">
        Immutable-style audit trail for question control. Teacher disable actions
        are included so you can answer “who turned off this question for Group A?”
      </p>

      <div className="mt-6">
        <ActivityLogPanel
          basePath={LIST_PATH}
          items={activity.items}
          page={activity.page}
          pageSize={activity.pageSize}
          total={activity.total}
          totalPages={activity.totalPages}
          actionFilter={actionFilter}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/levels">Question bank levels</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings">Curriculum settings</Link>
        </Button>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <ScrollText className="size-3.5 shrink-0" aria-hidden />
        Events are recorded server-side when admins or teachers change question
        control settings.
      </p>
    </AppShell>
  );
}
