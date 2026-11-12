"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BookMarked,
  ClipboardCheck,
  ListChecks,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { GroupCompletionRow } from "@/lib/group-completion";
import { teachingAttention } from "@/lib/dashboard-insights";
import { DashboardLink, DashboardProgress } from "./dashboard-primitives";

export function TeachingFocus({
  rows,
  groups,
  canManageHomework,
  canScheduleExams,
  canManagePerformance,
}: {
  rows: GroupCompletionRow[] | null;
  groups: { id: string; name: string }[];
  canManageHomework: boolean;
  canScheduleExams: boolean;
  canManagePerformance: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState<"attention" | "all">("attention");
  const groupId = groups.some((group) => group.id === selected) ? selected : "";
  const allRows = teachingAttention(rows ?? []).filter(
    (row) => !groupId || row.groupId === groupId,
  );
  const visibleRows =
    filter === "attention"
      ? allRows.filter((row) => row.inactive + row.practisingWithoutPass > 0)
      : allRows;
  const inactive = allRows.reduce((sum, row) => sum + row.inactive, 0);
  const withoutPass = allRows.reduce(
    (sum, row) => sum + row.practisingWithoutPass,
    0,
  );
  const destination = (section: string, fallback: string) =>
    groupId ? `/teacher/groups/${groupId}/${section}` : fallback;
  return (
    <section
      className="teaching-focus"
      aria-labelledby="teaching-priorities-title"
    >
      <div className="teaching-focus-header">
        <div>
          <p className="dashboard-eyebrow">Plan your next move</p>
          <h2 id="teaching-priorities-title">Teaching priorities</h2>
        </div>
        <label>
          <span className="sr-only">Choose a teaching group</span>
          <select
            value={groupId}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">All assigned groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="teaching-focus-body">
        <div className="attention-workspace">
          {rows && (
            <div className="attention-counters" aria-live="polite">
              <div>
                <span className="attention-dot" />
                <strong>{inactive}</strong>
                <span>no finished practice</span>
              </div>
              <div>
                <span className="attention-dot attention-dot-violet" />
                <strong>{withoutPass}</strong>
                <span>practising, no pass yet</span>
              </div>
              <p>Students · last 7 days</p>
            </div>
          )}
          {rows && (
            <div
              className="insight-switch my-4 w-fit"
              role="group"
              aria-label="Filter teaching priorities"
            >
              <button
                type="button"
                aria-pressed={filter === "attention"}
                onClick={() => setFilter("attention")}
              >
                Needs attention
              </button>
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All groups
              </button>
            </div>
          )}
          <div className="attention-group-list" aria-live="polite">
            {!groups.length ? (
              <div className="attention-empty">
                <Users className="size-7" aria-hidden="true" />
                <h3>No assigned groups yet</h3>
                <p>An institute admin can assign groups to your account.</p>
              </div>
            ) : rows == null ? (
              <div className="attention-empty">
                <h3>Your groups are ready</h3>
                <p>
                  Practice analytics are not enabled for your account. Choose a
                  group to continue teaching.
                </p>
              </div>
            ) : !visibleRows.length ? (
              <div className="attention-empty">
                <h3>
                  {allRows.some((row) => row.studentCount > 0)
                    ? "No practice gaps in this view"
                    : "Your groups are ready for students"}
                </h3>
                <p>
                  {allRows.some((row) => row.studentCount > 0)
                    ? "Every enrolled student in this view has at least one timed practice pass this week."
                    : "Add learners to your assigned groups to follow their progress."}
                </p>
              </div>
            ) : (
              visibleRows.map((row) => (
                <article key={row.groupId} className="attention-group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3>
                        {row.inactive
                          ? "Reconnect with "
                          : row.practisingWithoutPass
                            ? "Support "
                            : "Progress in "}
                        {row.groupName}
                      </h3>
                      <p>
                        {row.inactive
                          ? `${row.inactive} of ${row.studentCount} students have no finished timed practice this week.`
                          : row.practisingWithoutPass
                            ? `${row.practisingWithoutPass} active students have not passed a timed practice this week.`
                            : `${row.studentsPassed} of ${row.studentCount} students passed this week.`}
                      </p>
                    </div>
                    <span className="attention-group-rate">
                      {row.studentCompletionRate}%<small>with a pass</small>
                    </span>
                  </div>
                  <DashboardProgress
                    value={row.studentCompletionRate}
                    label={`${row.groupName}: students with a practice pass`}
                  />
                  <div className="mt-3 flex flex-wrap justify-between gap-2">
                    <span className="dashboard-caption">
                      {row.activeStudents}/{row.studentCount} active ·{" "}
                      {row.sessions} attempts
                    </span>
                    <DashboardLink
                      href={`/teacher/groups/${row.groupId}/analytics`}
                    >
                      Review group progress
                    </DashboardLink>
                  </div>
                </article>
              ))
            )}
          </div>
          {groups.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {groups
                .filter((group) => !groupId || group.id === groupId)
                .slice(0, 4)
                .map((group) => (
                  <DashboardLink
                    key={group.id}
                    href={`/teacher/groups/${group.id}`}
                  >
                    {group.name}
                  </DashboardLink>
                ))}
            </div>
          )}
        </div>
        <aside
          className="teaching-task-rail"
          aria-label="Quick teaching actions"
        >
          <p className="dashboard-eyebrow">Action workspace</p>
          <h3>
            {groupId
              ? groups.find((group) => group.id === groupId)?.name
              : "What needs doing?"}
          </h3>
          <p className="dashboard-caption">
            {groupId
              ? "Actions for your selected group."
              : "Select a group for direct class actions."}
          </p>
          {[
            ...(canManagePerformance
              ? [
                  {
                    label: "Record class marks",
                    description: "Date-wise marks & attendance",
                    icon: ListChecks,
                    href: destination("performance", "/teacher/groups"),
                  },
                ]
              : []),
            ...(canManageHomework
              ? [
                  {
                    label: "Review homework",
                    description: "Submissions, scores & feedback",
                    icon: BookMarked,
                    href: destination("homework", "/teacher/homework"),
                  },
                ]
              : []),
            ...(canScheduleExams
              ? [
                  {
                    label: "Plan an exam",
                    description: "Assessment schedules",
                    icon: ClipboardCheck,
                    href: destination("exams", "/teacher/exams"),
                  },
                ]
              : []),
            {
              label: "Open student list",
              description: "Accounts & learner details",
              icon: Users,
              href: destination("students", "/teacher/students"),
            },
          ].map(({ label, description, icon: Icon, href }) => (
            <Link key={label} href={href} className="teaching-task">
              <span>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <strong>{label}</strong>
                <small>{description}</small>
              </div>
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ))}
          <DashboardLink href="/teacher/ranking">
            Practice ranking
          </DashboardLink>
        </aside>
      </div>
    </section>
  );
}
