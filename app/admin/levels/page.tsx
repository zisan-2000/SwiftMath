import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Plus, Settings } from "lucide-react";

import { OperationType } from "@/lib/generated/prisma/enums";
import { listLevels } from "@/server/admin";
import { loadAdminPageContext } from "@/server/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { Card, CardContent } from "@/components/ui/card";
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

const OPERATION_SYMBOL: Record<OperationType, string> = {
  [OperationType.ADDITION]: "+",
  [OperationType.SUBTRACTION]: "−",
  [OperationType.MULTIPLICATION]: "×",
  [OperationType.DIVISION]: "÷",
  [OperationType.MIXED]: "+ / −",
};

export default async function AdminLevelsPage() {
  const { admin, institute } = await loadAdminPageContext();
  const levels = await listLevels(admin.instituteId, { includeArchived: true });

  const activeLevels = levels.filter((level) => level.archivedAt == null);
  const archivedLevels = levels.filter((level) => level.archivedAt != null);

  return (
    <AdminPageShell
      user={admin}
      institute={institute}
      title="Levels"
      subtitle="Your institute curriculum — open a level to manage its bank and rules."
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

      {activeLevels.length === 0 ? (
        <EmptyState
          icon={Layers}
          className="mt-6"
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
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {activeLevels.map((level) => (
            <li key={level.id}>
              <Card className="overflow-hidden transition-colors hover:border-primary/40">
                <CardContent className="p-0">
                  <Link
                    href={`/admin/levels/${level.id}`}
                    className="group flex items-center justify-between gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-lg font-semibold text-foreground group-hover:text-primary">
                        <span className="mr-2 tabular-nums text-muted-foreground">
                          {level.orderIndex}.
                        </span>
                        {level.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {OPERATION_SYMBOL[level.operation]} · {level.questionCount}{" "}
                        qs · {level.timeLimitSeconds}s · pass {level.passAccuracy}%
                        {" · "}
                        {level._count.studentsOnLevel}{" "}
                        {level._count.studentsOnLevel === 1 ? "student" : "students"}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <div className="flex flex-wrap gap-2 px-5 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/levels/${level.id}/questions`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        Question bank
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/levels/${level.id}/settings`}>
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {archivedLevels.length > 0 && (
        <Card className="mt-8">
          <CardContent className="p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                Archived levels ({archivedLevels.length})
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedLevels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell className="tabular-nums">{level.orderIndex}</TableCell>
                    <TableCell>
                      <span className="font-medium">{level.name}</span>
                      <Badge variant="muted" className="ml-2">
                        Archived
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {level._count.studentsOnLevel}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/levels/${level.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminPageShell>
  );
}
