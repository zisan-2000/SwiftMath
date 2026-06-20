import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getInstituteLeaderboard } from "@/server/ranking";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Ranking · ${APP_NAME}`,
};

export default async function StudentRankingPage() {
  const student = await requireRole(Role.STUDENT);

  const [institute, leaderboard] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: student.instituteId },
      select: { name: true },
    }),
    getInstituteLeaderboard(student.instituteId),
  ]);

  const myRank = leaderboard.find((row) => row.studentId === student.id);

  return (
    <AppShell
      user={student}
      instituteName={institute?.name ?? "Institute"}
      title="Ranking"
      subtitle={
        myRank
          ? `You're ranked #${myRank.rank} of ${leaderboard.length}.`
          : "Institute leaderboard."
      }
    >
      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No students to rank yet"
          description="Once students start practising, the leaderboard fills up here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Passed</TableHead>
                  <TableHead className="text-right">Avg. accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((row) => {
                  const isMe = row.studentId === student.id;
                  return (
                    <TableRow
                      key={row.studentId}
                      className={cn(isMe && "bg-primary/5 hover:bg-primary/10")}
                    >
                      <TableCell className="font-semibold tabular-nums text-foreground">
                        {row.rank}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <span className="flex items-center gap-2">
                          {row.name}
                          {isMe && <Badge>You</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.levelName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {row.passedCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {row.avgAccuracy}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
