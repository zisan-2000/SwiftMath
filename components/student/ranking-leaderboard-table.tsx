import Link from "next/link";

import { formatPassDuration, type RankedLeaderboardRow } from "@/lib/ranking";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LeaderboardTableRow = RankedLeaderboardRow & {
  instituteName?: string;
};

interface RankingLeaderboardTableProps {
  rows: LeaderboardTableRow[];
  /** Highlight this student row (student self-view). */
  currentStudentId?: string;
  showInstitute?: boolean;
  /** When set, student names link to the teacher progress page. */
  getStudentHref?: (row: LeaderboardTableRow) => string | null;
}

/** Shared institute / global ranking table. */
export function RankingLeaderboardTable({
  rows,
  currentStudentId,
  showInstitute = false,
  getStudentHref,
}: RankingLeaderboardTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>#</TableHead>
              <TableHead>Student</TableHead>
              {showInstitute && <TableHead>Institute</TableHead>}
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Best time</TableHead>
              <TableHead className="text-right">Passed</TableHead>
              <TableHead className="text-right">Avg. accuracy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isMe =
                currentStudentId != null && row.studentId === currentStudentId;
              const href = getStudentHref?.(row) ?? null;
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
                      {href ? (
                        <Link
                          href={href}
                          className="font-medium transition-colors hover:text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                      ) : (
                        row.name
                      )}
                      {isMe && <Badge>You</Badge>}
                    </span>
                  </TableCell>
                  {showInstitute && (
                    <TableCell className="text-muted-foreground">
                      {row.instituteName ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {row.levelName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {row.fastestPassMs != null
                      ? formatPassDuration(row.fastestPassMs)
                      : "—"}
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
  );
}
