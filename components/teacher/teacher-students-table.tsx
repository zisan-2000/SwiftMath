"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StudentSearch,
  useStudentSearch,
} from "@/components/ui/student-search";
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
  const { query, setQuery, filteredStudents } = useStudentSearch(students);

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
      <div className="border-b border-border p-4">
        <StudentSearch
          id="teacher-students-search"
          query={query}
          onQueryChange={setQuery}
          resultCount={filteredStudents.length}
          totalCount={students.length}
        />
      </div>
      <div className="overflow-x-auto">
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
          {filteredStudents.map((student) => (
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
          {filteredStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No students match “{query.trim()}”.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
