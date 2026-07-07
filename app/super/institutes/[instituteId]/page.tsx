import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Layers,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";

import { loadSuperInstitutePageContext } from "@/server/super-page";
import { SuperInstituteShell } from "@/components/super/super-institute-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}): Promise<Metadata> {
  const { instituteId } = await params;
  const { institute } = await loadSuperInstitutePageContext(instituteId);
  return { title: institute.name };
}

export default async function SuperInstituteOverviewPage({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}) {
  const { instituteId } = await params;
  const { user, institute, admins, teachers, students, groups, levels } =
    await loadSuperInstitutePageContext(instituteId);

  const created = institute.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const shortcuts = [
    {
      href: `/super/institutes/${instituteId}/admins`,
      label: "Admins",
      description: "View institute admins and reset passwords",
      icon: ShieldCheck,
    },
    {
      href: `/super/institutes/${instituteId}/settings`,
      label: "Settings",
      description: "Edit branding, slug, and enable/disable institute",
      icon: Settings,
    },
  ];

  return (
    <SuperInstituteShell
      user={user}
      instituteId={instituteId}
      instituteName={institute.name}
      subtitle="Institute overview for support and troubleshooting."
    >
      <Card className="mb-8">
        <CardContent className="flex min-w-0 items-start gap-3 p-5">
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Admins" value={admins.length} icon={ShieldCheck} />
        <StatCard label="Teachers" value={teachers} icon={Users} />
        <StatCard label="Students" value={students} icon={GraduationCap} />
        <StatCard label="Groups" value={groups} icon={UsersRound} />
        <StatCard label="Levels" value={levels} icon={Layers} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Institute id:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {institute.id}
        </code>
      </p>
    </SuperInstituteShell>
  );
}
