import Link from "next/link";
import { GraduationCap } from "lucide-react";

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

export interface TeacherStudentRow {
  id: string;
  name: string;
  email: string;
  currentLevel: { name: string } | null;
  group: { id: string; name: string };
}

/** Cross-group student roster for the teacher area. */
export function TeacherStudentsTable({ students }: { students: TeacherStudentRow[] }) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No students yet"
        description="Add students from a group, or create a group first."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {student.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {student.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Link
                  href={`/teacher/groups/${student.group.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {student.group.name}
                </Link>
              </TableCell>
              <TableCell>
                {student.currentLevel ? (
                  <Badge variant="secondary">{student.currentLevel.name}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/teacher/groups/${student.group.id}/students/${student.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View progress
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
