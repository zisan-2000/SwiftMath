import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Clock,
  GraduationCap,
  ListChecks,
  Settings,
  Target,
} from "lucide-react";

import { OperationType } from "@/lib/generated/prisma/enums";
import { getLevelBankStats } from "@/server/question-bank";
import { loadAdminLevelPageContext } from "@/server/admin-page";
import { AdminLevelShell } from "@/components/admin/admin-level-shell";
import { LevelBankCoverageBanner } from "@/components/admin/level-bank-coverage-banner";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const OPERATION_LABEL: Record<OperationType, string> = {
  [OperationType.ADDITION]: "Addition",
  [OperationType.SUBTRACTION]: "Subtraction",
  [OperationType.MULTIPLICATION]: "Multiplication",
  [OperationType.DIVISION]: "Division",
  [OperationType.MIXED]: "Mixed",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ levelId: string }>;
}): Promise<Metadata> {
  const { levelId } = await params;
  const { level } = await loadAdminLevelPageContext(levelId);
  return {
    title: level.archivedAt ? `${level.name} (archived)` : level.name,
  };
}

export default async function AdminLevelOverviewPage({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const { admin, institute, level } = await loadAdminLevelPageContext(levelId);
  const bankStats = await getLevelBankStats(admin, levelId);

  if (!bankStats) {
    notFound();
  }

  const isArchived = level.archivedAt != null;

  const shortcuts = [
    {
      href: `/admin/levels/${levelId}/questions`,
      label: "Question bank",
      description: "Add, import, publish, and reorder fixed prompts",
      icon: BookOpen,
    },
    {
      href: `/admin/levels/${levelId}/settings`,
      label: "Settings",
      description: "Edit rules, timers, bank-only mode, archive level",
      icon: Settings,
    },
  ];

  return (
    <AdminLevelShell
      user={admin}
      institute={institute}
      levelId={levelId}
      levelName={level.name}
      subtitle={
        isArchived
          ? "Archived level — restore from Settings to edit again."
          : "Level overview — open the tabs to manage the bank and rules."
      }
    >
      {isArchived && (
        <Badge variant="muted" className="mb-4">
          Archived
        </Badge>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students on level"
          value={level._count.studentsOnLevel}
          icon={GraduationCap}
        />
        <StatCard
          label="Questions / session"
          value={level.questionCount}
          icon={ListChecks}
        />
        <StatCard
          label="Time limit"
          value={`${level.timeLimitSeconds}s`}
          icon={Clock}
        />
        <StatCard
          label="Pass accuracy"
          value={`${level.passAccuracy}%`}
          icon={Target}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Operation</dt>
              <dd className="font-medium text-foreground">
                {OPERATION_LABEL[level.operation]}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Order index</dt>
              <dd className="font-medium text-foreground">{level.orderIndex}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Number range</dt>
              <dd className="font-medium text-foreground">
                {level.minNumber}–{level.maxNumber} · {level.termsPerQuestion}{" "}
                terms
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Prerequisite</dt>
              <dd className="font-medium text-foreground">
                {level.orderIndex > 1 && level.requiresPreviousPass
                  ? "Previous level pass required"
                  : "Open entry"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bank mode</dt>
              <dd className="font-medium text-foreground">
                {level.bankOnly ? "Bank-only (no dynamic generation)" : "Hybrid"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6">
        <LevelBankCoverageBanner
          sessionQuestionCount={level.questionCount}
          totalBankCount={bankStats.totalBankCount}
          activeBankCount={bankStats.activeBankCount}
          bankOnly={level.bankOnly}
        />
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
    </AdminLevelShell>
  );
}
