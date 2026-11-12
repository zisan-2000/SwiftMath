"use client";

import { useState } from "react";
import {
  Bell,
  BookMarked,
  Boxes,
  GraduationCap,
  Layers,
  Search,
  ScrollText,
  Users,
} from "lucide-react";
import { ActionWorkspace, type WorkspaceAction } from "./dashboard-primitives";

export interface ManagementWorkspaceProps {
  teachers: number;
  students: number;
  groups: number;
  levels: number;
  academicLevels: number;
  canViewReports: boolean;
}
const categories = [
  { id: "all", label: "All tools" },
  { id: "people", label: "People" },
  { id: "curriculum", label: "Curriculum" },
  { id: "operations", label: "Operations" },
] as const;

/** Filter tools, not student records: all destinations keep their existing guards. */
export function ManagementWorkspace({
  teachers,
  students,
  groups,
  levels,
  academicLevels,
  canViewReports,
}: ManagementWorkspaceProps) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const actions: (WorkspaceAction & { category: string; keywords: string })[] =
    [
      {
        href: "/admin/teachers",
        label: "Teaching team",
        description: "People behind the progress",
        icon: Users,
        value: teachers,
        category: "people",
        keywords: "teachers staff",
      },
      {
        href: "/admin/students",
        label: "Students",
        description: "Accounts, groups & academic levels",
        icon: GraduationCap,
        value: students,
        category: "people",
        keywords: "learners",
      },
      {
        href: "/admin/groups",
        label: "Groups",
        description: "Classes & teacher assignments",
        icon: Boxes,
        value: groups,
        category: "people",
        keywords: "classes",
      },
      {
        href: "/admin/levels",
        label: "Practice curriculum",
        description: "Sub-levels & question banks",
        icon: Layers,
        value: levels,
        category: "curriculum",
        keywords: "levels questions",
      },
      {
        href: "/admin/academic-levels",
        label: "Academic levels",
        description: "Teacher-controlled main levels",
        icon: BookMarked,
        value: academicLevels,
        category: "curriculum",
        keywords: "main level",
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        description: "Stay connected to your institute",
        icon: Bell,
        category: "operations",
        keywords: "updates alerts",
      },
      ...(canViewReports
        ? [
            {
              href: "/admin/reports",
              label: "Reports",
              description: "Filter, compare & export",
              icon: ScrollText,
              category: "operations",
              keywords: "pdf print analytics",
            },
          ]
        : []),
    ];
  const search = query.trim().toLowerCase();
  const filtered = actions.filter(
    (action) =>
      (category === "all" || action.category === category) &&
      `${action.label} ${action.description} ${action.keywords}`
        .toLowerCase()
        .includes(search),
  );
  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter management tools"
        >
          {categories.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className={`min-h-8 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${category === item.id ? "border-primary/20 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-accent"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="relative block min-w-0 xl:w-56">
          <span className="sr-only">Find a management tool</span>
          <Search
            className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a tool…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {filtered.length} management tools available
      </p>
      {filtered.length ? (
        <ActionWorkspace actions={filtered} />
      ) : (
        <div className="dashboard-panel">
          <p className="text-sm font-medium">No matching tools</p>
          <p className="dashboard-description">
            Try another name or clear your filters.
          </p>
          <button
            type="button"
            className="dashboard-text-link mt-3 min-h-9"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
