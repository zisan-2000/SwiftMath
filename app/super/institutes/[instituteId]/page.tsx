import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  GraduationCap,
  Layers,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";

import { requireSuperAdmin } from "@/lib/session";
import { getInstituteDetail } from "@/server/super";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { StatCard } from "@/components/stat-card";
import { EditInstituteDialog } from "@/components/super/edit-institute-dialog";
import { InstituteActiveToggle } from "@/components/super/institute-active-toggle";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { resetInstituteAdminPasswordAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}): Promise<Metadata> {
  const { instituteId } = await params;
  const detail = await getInstituteDetail(instituteId);
  const title = detail?.institute.name ?? "Institute";
  return { title };
}

/**
 * SUPER_ADMIN → institute drill-in. Support view for a single tenant: branding,
 * role counts, enable/disable, and admin password reset.
 */
export default async function SuperInstituteDetailPage({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}) {
  const { instituteId } = await params;
  const user = await requireSuperAdmin();
  const detail = await getInstituteDetail(instituteId);

  if (!detail) {
    notFound();
  }

  const { institute, admins, teachers, students, groups, levels } = detail;
  const created = institute.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <AppShell
      user={user}
      instituteName="Platform"
      title={institute.name}
      subtitle="Institute detail for support and troubleshooting."
    >
      <BackLink href="/super/institutes">All institutes</BackLink>

      <Card className="mb-8">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {institute.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={institute.logoUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-md border border-border object-contain"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                {institute.name}
                {!institute.isActive && <Badge variant="muted">Disabled</Badge>}
              </p>
              <p className="text-sm text-muted-foreground">/{institute.slug}</p>
              {institute.tagline && (
                <p className="mt-1 text-sm text-muted-foreground/80">
                  {institute.tagline}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground/80">
                Created {created}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Admins" value={admins.length} icon={ShieldCheck} />
        <StatCard label="Teachers" value={teachers} icon={Users} />
        <StatCard label="Students" value={students} icon={GraduationCap} />
        <StatCard label="Groups" value={groups} icon={UsersRound} />
        <StatCard label="Levels" value={levels} icon={Layers} />
      </div>

      <Card className="mt-8">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Institute admins ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {admins.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ShieldCheck}
                title="No admin accounts"
                description="This institute has no ADMIN users. Create one when provisioning a new tenant, or add support tooling later."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {admins.map((admin) => (
                <li
                  key={admin.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-foreground">
                      {admin.name}
                      {!admin.isActive && (
                        <Badge variant="muted">Disabled</Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {admin.email}
                    </p>
                  </div>
                  <ResetPasswordForm
                    action={resetInstituteAdminPasswordAction.bind(
                      null,
                      institute.id,
                      admin.id,
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        Institute id:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {institute.id}
        </code>
        {" · "}
        <Link href="/super/institutes" className="text-primary hover:underline">
          Back to list
        </Link>
      </p>
    </AppShell>
  );
}
