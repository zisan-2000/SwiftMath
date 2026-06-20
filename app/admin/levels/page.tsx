import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, OperationType } from "@/lib/generated/prisma/enums";
import { listLevels } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { LevelForm } from "@/components/admin/level-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createLevelAction } from "./actions";

export const metadata: Metadata = {
  title: `Levels · ${APP_NAME}`,
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
      select: { name: true },
    }),
    listLevels(admin.instituteId),
  ]);

  // Suggest the next free order position so the create form is one click away.
  const nextOrder =
    levels.reduce((max, l) => Math.max(max, l.orderIndex), 0) + 1;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Levels"
      subtitle="The practice curriculum students progress through."
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card className="mb-8">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All levels ({levels.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {levels.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Layers}
                title="No levels yet"
                description="Add your first level using the form below."
              />
            </div>
          ) : (
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
                {levels.map((level) => (
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a level</CardTitle>
        </CardHeader>
        <CardContent>
          <LevelForm
            action={createLevelAction}
            submitLabel="Create level"
            defaults={{
              name: "",
              operation: OperationType.ADDITION,
              orderIndex: nextOrder,
              termsPerQuestion: 2,
              minNumber: 1,
              maxNumber: 9,
              questionCount: 10,
              timeLimitSeconds: 120,
              passAccuracy: 70,
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
