"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HOMEWORK_REPORT_STATUSES,
  REPORT_MODULES,
  REPORT_LABELS,
  defaultReportDates,
  type ReportQuery,
} from "@/lib/reports";

export interface ReportOptions {
  groups: { id: string; name: string }[];
  students: {
    id: string;
    name: string;
    contactNumber: string | null;
    groupId: string | null;
  }[];
  levels: { id: string; name: string }[];
}
const selectClass =
  "h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: ReportOptions["students"];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = students.find((student) => student.id === value);
  const [search, setSearch] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = search.trim().toLocaleLowerCase();
  const matches = students.filter(
    (student) =>
      student.name.toLocaleLowerCase().includes(q) ||
      (/\d/.test(q) &&
        student.contactNumber
          ?.replace(/\D/g, "")
          .includes(q.replace(/\D/g, ""))),
  );
  const visible = matches.slice(0, 30);
  function choose(student: ReportOptions["students"][number]) {
    setSearch(student.name);
    onChange(student.id);
    setOpen(false);
  }
  return (
    <div
      className="relative space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Label htmlFor="report-student-search">Student</Label>
      <input type="hidden" name="studentId" value={value} />
      <Input
        id="report-student-search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="report-student-options"
        aria-activedescendant={
          open && visible[active] ? `report-student-${active}` : undefined
        }
        autoComplete="off"
        value={search}
        placeholder="Type name or contact number"
        required
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          onChange("");
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
              Math.max(
                0,
                Math.min(
                  visible.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && open) {
            event.preventDefault();
            if (visible[active]) choose(visible[active]);
          }
        }}
      />
      {open && (
        <div className="absolute z-20 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          <ul
            id="report-student-options"
            role="listbox"
            aria-label="Matching students"
          >
            {visible.map((student, index) => (
              <li
                key={student.id}
                id={`report-student-${index}`}
                role="option"
                aria-selected={value === student.id}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={`w-full rounded px-3 py-2 text-left text-sm ${index === active ? "bg-accent" : "hover:bg-accent"}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(student)}
                >
                  {student.name}
                  {student.contactNumber && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {student.contactNumber}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {!matches.length && (
            <p className="p-3 text-sm" role="status">
              No matching students.
            </p>
          )}
          {matches.length > 30 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Type more to narrow {matches.length} matches.
            </p>
          )}
        </div>
      )}
      {selected && (
        <p className="text-xs text-muted-foreground">
          Selected: {selected.name}
          {selected.contactNumber ? ` · ${selected.contactNumber}` : ""}
        </p>
      )}
      {!value && search && (
        <p className="text-xs text-muted-foreground">
          Choose a student from the matches.
        </p>
      )}
    </div>
  );
}

export function ReportFiltersForm({
  options,
  query,
  basePath,
  pending = false,
  onDraftChange,
  onGenerate,
  onReset,
}: {
  options: ReportOptions;
  query: ReportQuery;
  basePath: string;
  pending?: boolean;
  onDraftChange?: (query: ReportQuery) => void;
  onGenerate?: (form: FormData) => void;
  onReset?: () => void;
}) {
  const value = (key: string, fallback = "") =>
    typeof query[key] === "string" ? (query[key] as string) : fallback;
  const dates = defaultReportDates();
  const [draft, setDraft] = useState(() => ({
    scope: value("scope", "group"),
    groupId: value("groupId"),
    studentId: value("studentId"),
    from: value("from", dates.from),
    to: value("to", dates.to),
    view: value("view", "both"),
    homeworkStatus: value("homeworkStatus"),
    page: value("page"),
    timing: value("timing"),
    levelId: value("levelId"),
    practiceMode: value("practiceMode"),
  }));
  const [modules, setModules] = useState<string[]>(() =>
    query.modules
      ? typeof query.modules === "string"
        ? [query.modules]
        : query.modules
      : query.generate
        ? []
        : ["class", "homework"],
  );
  const hasHomework = modules.includes("homework"),
    hasPractice = modules.includes("practice"),
    hasLevel = hasPractice || modules.includes("exam");
  useEffect(() => {
    onDraftChange?.({
      ...draft,
      modules,
      homeworkStatus: hasHomework ? draft.homeworkStatus : "",
      page: hasHomework ? draft.page : "",
      timing: hasHomework ? draft.timing : "",
      levelId: hasLevel ? draft.levelId : "",
      practiceMode: hasPractice ? draft.practiceMode : "",
    });
  }, [draft, modules, hasHomework, hasLevel, hasPractice, onDraftChange]);
  const update = (key: keyof typeof draft, next: string) =>
    setDraft((old) => ({ ...old, [key]: next }));
  const select = (
    key: keyof typeof draft,
    label: string,
    choices: { id: string; name: string }[],
    placeholder: string,
    required = false,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`report-${key}`}>{label}</Label>
      <select
        id={`report-${key}`}
        name={key}
        className={selectClass}
        value={draft[key]}
        onChange={(event) => update(key, event.target.value)}
        required={required}
      >
        <option value="">{placeholder}</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <form
      action={basePath}
      method="get"
      aria-busy={pending}
      className="report-screen-only mb-6 min-w-0 rounded-xl border bg-card p-4 sm:p-6"
      onSubmit={
        onGenerate
          ? (event) => {
              event.preventDefault();
              if (!pending) onGenerate(new FormData(event.currentTarget));
            }
          : undefined
      }
    >
      <fieldset disabled={pending} className="min-w-0 space-y-5">
        <input type="hidden" name="generate" value="1" />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-scope">Report for</Label>
            <select
              id="report-scope"
              name="scope"
              className={selectClass}
              value={draft.scope}
              onChange={(event) => update("scope", event.target.value)}
            >
              <option value="group">Group</option>
              <option value="student">Individual student</option>
            </select>
          </div>
          {draft.scope === "group" ? (
            select("groupId", "Group", options.groups, "Choose group", true)
          ) : (
            <StudentPicker
              students={options.students}
              value={draft.studentId}
              onChange={(id) => update("studentId", id)}
            />
          )}
          <div className="space-y-2">
            <Label htmlFor="report-view">Report format</Label>
            <select
              id="report-view"
              name="view"
              className={selectClass}
              value={draft.view}
              onChange={(event) => update("view", event.target.value)}
            >
              <option value="both">Summary + Date-wise details</option>
              <option value="summary">Summary only</option>
              <option value="details">Date-wise details only</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-from">From (Bangladesh date)</Label>
            <Input
              id="report-from"
              name="from"
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              required
              onChange={(event) => update("from", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              name="to"
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              required
              onChange={(event) => update("to", event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {[30, 90, 180].map((days) => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const end = new Date(`${dates.to}T00:00:00Z`);
                  end.setUTCDate(end.getUTCDate() - days + 1);
                  setDraft((old) => ({
                    ...old,
                    from: end.toISOString().slice(0, 10),
                    to: dates.to,
                  }));
                }}
              >
                Last {days} days
              </Button>
            ))}
          </div>
        </div>
        <fieldset className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-medium">Include sections</legend>
          <div className="flex flex-wrap gap-4">
            {REPORT_MODULES.map((module) => (
              <label key={module} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="modules"
                  value={module}
                  checked={modules.includes(module)}
                  onChange={(event) =>
                    setModules((old) =>
                      event.target.checked
                        ? [...old, module]
                        : old.filter((item) => item !== module),
                    )
                  }
                />
                {REPORT_LABELS[module]}
              </label>
            ))}
          </div>
        </fieldset>
        {(hasHomework || hasLevel) && (
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Additional filters
            </summary>
            <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hasHomework && (
                <>
                  {select(
                    "homeworkStatus",
                    "Homework status",
                    HOMEWORK_REPORT_STATUSES.map((status) => ({
                      id: status,
                      name: status.replaceAll("_", " "),
                    })),
                    "All statuses",
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="report-page">Homework page</Label>
                    <Input
                      id="report-page"
                      name="page"
                      value={draft.page}
                      onChange={(event) => update("page", event.target.value)}
                      maxLength={80}
                      placeholder="Full or partial page"
                    />
                  </div>
                  {select(
                    "timing",
                    "Homework timing",
                    [
                      { id: "on-time", name: "On time" },
                      { id: "late", name: "Late" },
                    ],
                    "On time or late",
                  )}
                </>
              )}
              {hasLevel &&
                select(
                  "levelId",
                  "Exam / Practice sub-level",
                  options.levels,
                  "All sub-levels",
                )}
              {hasPractice &&
                select(
                  "practiceMode",
                  "Practice mode",
                  ["STANDARD", "REVIEW", "CHALLENGE"].map((id) => ({
                    id,
                    name: id,
                  })),
                  "All practice modes",
                )}
            </div>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Generating report…" : "Generate report"}
          </Button>
          {!pending && onReset && (
            <Button type="button" variant="outline" onClick={onReset}>
              Reset
            </Button>
          )}
          {!pending && !onReset && (
            <Button asChild variant="outline">
              <Link href={basePath}>Reset</Link>
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
