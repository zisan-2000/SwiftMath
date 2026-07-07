import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Settings, ShieldCheck } from "lucide-react";

import { listInstitutesWithStats } from "@/server/super";
import { loadSuperPageContext } from "@/server/super-page";
import { SuperPageShell } from "@/components/super/super-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddInstituteDialog } from "@/components/super/add-institute-dialog";
import { EditInstituteDialog } from "@/components/super/edit-institute-dialog";
import { InstituteActiveToggle } from "@/components/super/institute-active-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Institutes",
};

/**
 * SUPER_ADMIN → institutes. Cross-tenant list of every institute on the
 * platform with its user/group/level counts.
 */
export default async function SuperInstitutesPage() {
  const { user } = await loadSuperPageContext();
  const institutes = await listInstitutesWithStats();

  return (
    <SuperPageShell
      user={user}
      title="Institutes"
      subtitle="Every institute on the platform."
      actions={<AddInstituteDialog />}
    >
      <BackLink href="/super">Super Admin dashboard</BackLink>

      {institutes.length === 0 ? (
        <EmptyState
          icon={Building2}
          className="mt-6"
          title="No institutes yet"
          description="Use the “New institute” button to create your first tenant."
          action={<AddInstituteDialog />}
        />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {institutes.map((institute) => (
            <li key={institute.id}>
              <Card className="overflow-hidden transition-colors hover:border-primary/40">
                <CardContent className="p-0">
                  <Link
                    href={`/super/institutes/${institute.id}`}
                    className="group flex items-center justify-between gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {institute.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={institute.logoUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-md border border-border object-contain"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="block truncate text-lg font-semibold text-foreground group-hover:text-primary">
                            {institute.name}
                          </span>
                          {!institute.isActive && (
                            <Badge variant="muted">Disabled</Badge>
                          )}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          /{institute.slug} · {institute._count.users}{" "}
                          {institute._count.users === 1 ? "user" : "users"} ·{" "}
                          {institute._count.groups}{" "}
                          {institute._count.groups === 1 ? "group" : "groups"} ·{" "}
                          {institute._count.levels}{" "}
                          {institute._count.levels === 1 ? "level" : "levels"}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/super/institutes/${institute.id}/admins`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admins
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/super/institutes/${institute.id}/settings`}>
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </Link>
                    </Button>
                    <EditInstituteDialog
                      institute={{
                        id: institute.id,
                        name: institute.name,
                        slug: institute.slug,
                        tagline: institute.tagline,
                        logoUrl: institute.logoUrl,
                      }}
                    />
                    <InstituteActiveToggle
                      instituteId={institute.id}
                      isActive={institute.isActive}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </SuperPageShell>
  );
}
