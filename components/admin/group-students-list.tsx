"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StudentSearch,
  useStudentSearch,
} from "@/components/ui/student-search";

interface AdminGroupStudent {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  currentLevel: { name: string } | null;
}

export function AdminGroupStudentsList({
  students,
}: {
  students: AdminGroupStudent[];
}) {
  const { query, setQuery, filteredStudents } = useStudentSearch(students);

  if (students.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Add students from the institute roster and assign them to this group."
          action={
            <Button asChild>
              <Link href="/admin/students">Go to institute roster</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border p-4">
        <StudentSearch
          id="admin-group-students-search"
          query={query}
          onQueryChange={setQuery}
          resultCount={filteredStudents.length}
          totalCount={students.length}
        />
      </div>
      {filteredStudents.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No students match “{query.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filteredStudents.map((student) => (
            <li
              key={student.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/students/${student.id}`}
                  className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                >
                  {student.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {student.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {student.currentLevel?.name ?? "No level"}
                </span>
                {!student.isActive ? <Badge variant="muted">Inactive</Badge> : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/students/${student.id}`}>View progress</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
