"use client";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface TeacherOption {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
}

/** Search is local and immediate. Hidden fields submit the complete selection,
 * including teachers currently hidden by the search filter. */
export function TeacherAssignmentPicker({
  teachers,
  defaultTeacherIds = [],
  readOnly = false,
}: {
  teachers: TeacherOption[];
  defaultTeacherIds?: string[];
  readOnly?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(defaultTeacherIds));
  const search = query.trim().toLocaleLowerCase();
  const visible = teachers.filter(
    (t) =>
      t.name.toLocaleLowerCase().includes(search) ||
      t.email.toLocaleLowerCase().startsWith(search),
  );
  function toggle(teacherId: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  }
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="text-sm font-medium">
        Assigned teachers
      </label>
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teachers by name or email…"
      />
      {[...selected].map((teacherId) => (
        <input
          key={teacherId}
          type="hidden"
          name="teacherIds"
          value={teacherId}
        />
      ))}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span role="status">{selected.size} selected</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={readOnly || !selected.size}
          onClick={() => setSelected(new Set())}
        >
          Clear all
        </Button>
      </div>
      <div
        className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2"
        role="group"
        aria-label="Teachers available for assignment"
      >
        {visible.map((teacher) => (
          <label
            key={teacher.id}
            className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent"
          >
            <input
              type="checkbox"
              checked={selected.has(teacher.id)}
              disabled={
                readOnly ||
                (teacher.isActive === false && !selected.has(teacher.id))
              }
              onChange={() => toggle(teacher.id)}
              className="size-4 accent-primary"
            />
            <span className="min-w-0 text-sm">
              <span className="block truncate font-medium">
                {teacher.name}
                {teacher.isActive === false ? " (disabled)" : ""}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {teacher.email}
              </span>
            </span>
          </label>
        ))}
        {!visible.length && (
          <p className="p-3 text-sm text-muted-foreground">
            No matching teachers.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        All assigned teachers share group access within their existing
        permissions. Removing a teacher revokes group access. You may leave the
        group unassigned.
      </p>
    </div>
  );
}
