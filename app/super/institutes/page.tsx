import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireSuperAdmin } from "@/lib/session";
import { listInstitutesWithStats } from "@/server/super";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddInstituteDialog } from "@/components/super/add-institute-dialog";
import { InstituteActiveToggle } from "@/components/super/institute-active-toggle";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: `Institutes · ${APP_NAME}`,
};

/**
 * SUPER_ADMIN → institutes. Cross-tenant list of every institute on the
 * platform with its user/group/level counts. Read-only in this step; creating
 * and managing institutes is added next.
 */
export default async function SuperInstitutesPage() {
  const user = await requireSuperAdmin();
  const institutes = await listInstitutesWithStats();

  return (
    <AppShell
      user={user}
      instituteName="Platform"
      title="Institutes"
      subtitle="Every institute on the platform."
      actions={<AddInstituteDialog />}
    >
      <BackLink href="/super">Super Admin dashboard</BackLink>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All institutes ({institutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {institutes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title="No institutes yet"
                description="Use the “New institute” button to create your first tenant."
                action={<AddInstituteDialog />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {institutes.map((institute) => (
                <li
                  key={institute.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-foreground">
                      {institute.name}
                      {!institute.isActive && (
                        <Badge variant="muted">Disabled</Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      /{institute.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {institute._count.users}{" "}
                        {institute._count.users === 1 ? "user" : "users"}
                      </span>
                      <span>
                        {institute._count.groups}{" "}
                        {institute._count.groups === 1 ? "group" : "groups"}
                      </span>
                      <span>
                        {institute._count.levels}{" "}
                        {institute._count.levels === 1 ? "level" : "levels"}
                      </span>
                    </span>
                    <InstituteActiveToggle
                      instituteId={institute.id}
                      isActive={institute.isActive}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
