"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { filterStudentsByName } from "@/lib/student-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function useStudentSearch<T extends { name: string }>(students: T[]) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredStudents = useMemo(
    () => filterStudentsByName(students, deferredQuery),
    [deferredQuery, students],
  );

  return { query, setQuery, filteredStudents };
}

export function StudentSearch({
  id,
  query,
  onQueryChange,
  resultCount,
  totalCount,
  className = "",
}: {
  id: string;
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id} className="sr-only">
        Search students by name
      </Label>
      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search student by name…"
          autoComplete="off"
          className="pl-9 pr-9"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear student search"
            className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => onQueryChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {query.trim()
          ? `${resultCount} of ${totalCount} students shown`
          : `${totalCount} students`}
      </p>
    </div>
  );
}
