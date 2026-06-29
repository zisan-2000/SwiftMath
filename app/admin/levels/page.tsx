import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, OperationType } from "@/lib/generated/prisma/enums";
import { listLevels } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Levels",
};

/** Short symbol per operation for the compact table. */
const OPERATION_SYMBOL: Record<OperationType, string> = {
  [OperationType.ADDITION]: "+",
  [OperationType.SUBTRACTION]: "−",
  [OperationType.MULTIPLICATION]: "×",
  [OperationType.DIVISION]: "÷",
  [OperationType.MIXED]: "+ / −",
};

/**
 * ADMIN → levels. Lists the institute's practice curriculum and lets the admin
 * add a new level. Editing a level lives on its own page.
 */
export default async function AdminLevelsPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listLevels(admin.instituteId, { includeArchived: true }),
  ]);

  const activeLevels = levels.filter((level) => level.archivedAt == null);
  const archivedLevels = levels.filter((level) => level.archivedAt != null);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Levels"
      subtitle="The practice curriculum students progress through."
      actions={
        <Button asChild>
          <Link href="/admin/levels/new">
            <Plus className="h-4 w-4" />
            Add level
          </Link>
        </Button>
      }
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Active levels ({activeLevels.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeLevels.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Layers}
                title="No levels yet"
                description="Use the “Add level” button to create your first level."
                action={
                  <Button asChild>
                    <Link href="/admin/levels/new">
                      <Plus className="h-4 w-4" />
                      Add level
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Compact cards on small screens */}
              <ul className="divide-y divide-border md:hidden">
                {activeLevels.map((level) => (
                  <li
                    key={level.id}
                    className="flex items-start justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        <span className="mr-2 tabular-nums text-muted-foreground">
                          {level.orderIndex}.
                        </span>
                        {level.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {OPERATION_SYMBOL[level.operation]} · {level.questionCount}{" "}
                        qs · {level.timeLimitSeconds}s · pass {level.passAccuracy}%
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {level.termsPerQuestion} terms · {level.minNumber}–
                        {level.maxNumber} · {level._count.studentsOnLevel} students
                        {level.orderIndex > 1 &&
                          (level.requiresPreviousPass
                            ? " · requires previous pass"
                            : " · open entry")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="shrink-0">
                      <Link href={`/admin/levels/${level.id}`}>Edit</Link>
                    </Button>
                  </li>
                ))}
              </ul>

              {/* Full table on md+ */}
              <div className="hidden md:block">
                <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Op</TableHead>
                  <TableHead className="text-right">Terms</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                  <TableHead className="text-right">Qs</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="text-right">Pass</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell className="font-semibold tabular-nums text-foreground">
                      {level.orderIndex}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {level.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {OPERATION_SYMBOL[level.operation]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {level.termsPerQuestion}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {level.minNumber}–{level.maxNumber}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {level.questionCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {level.timeLimitSeconds}s
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {level.passAccuracy}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {level._count.studentsOnLevel}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/levels/${level.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {archivedLevels.length > 0 && (
        <Card className="mt-8">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">
              Archived levels ({archivedLevels.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {archivedLevels.map((level) => (
                <li
                  key={level.id}
                  className="flex items-start justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                      <span className="tabular-nums text-muted-foreground">
                        {level.orderIndex}.
                      </span>
                      {level.name}
                      <Badge variant="muted">Archived</Badge>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {level._count.studentsOnLevel}{" "}
                      {level._count.studentsOnLevel === 1
                        ? "student"
                        : "students"}{" "}
                      still assigned
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="shrink-0">
                    <Link href={`/admin/levels/${level.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
