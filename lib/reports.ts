import { parseClassDate, todayInDhaka } from "@/lib/class-performance";
import { rowsToCsv } from "@/lib/csv";

export const REPORT_MODULES = [
  "class",
  "homework",
  "exam",
  "practice",
] as const;
export type ReportModule = (typeof REPORT_MODULES)[number];
export const REPORT_LABELS: Record<ReportModule, string> = {
  class: "Class Performance",
  homework: "Homework",
  exam: "Exam",
  practice: "Practice",
};
export const HOMEWORK_REPORT_STATUSES = [
  "APPROVED",
  "SUBMITTED",
  "REJECTED",
  "RESUBMISSION_REQUESTED",
  "MISSING",
  "INCOMPLETE",
  "IN_PROGRESS",
  "NOT_STARTED",
  "UPCOMING",
] as const;
export class ReportError extends Error {}
export type ReportQuery = Record<string, string | string[] | undefined>;
export function reportFormQuery(form: FormData): ReportQuery {
  const query: ReportQuery = {};
  for (const key of new Set(form.keys())) {
    const values = form.getAll(key).map(String);
    query[key] = key === "modules" || values.length > 1 ? values : values[0];
  }
  return query;
}
export interface ReportFilters {
  scope: "group" | "student";
  groupId: string;
  studentId: string;
  modules: ReportModule[];
  from: string;
  to: string;
  view: "summary" | "details" | "both";
  homeworkStatus: string;
  page: string;
  timing: "" | "on-time" | "late";
  levelId: string;
  practiceMode: "" | "STANDARD" | "REVIEW" | "CHALLENGE";
}
export function defaultReportDates(now = new Date()) {
  const to = todayInDhaka(now);
  return { from: `${to.slice(0, 7)}-01`, to };
}
export function parseReportFilters(query: ReportQuery): ReportFilters {
  const text = (key: string) => {
    const value = query[key];
    if (Array.isArray(value)) throw new ReportError(`Invalid ${key} filter.`);
    return value?.trim() ?? "";
  };
  const scope = text("scope");
  if (scope !== "group" && scope !== "student")
    throw new ReportError("Choose Group or Individual.");
  const groupId = text("groupId"),
    studentId = text("studentId");
  if (scope === "group" && !groupId) throw new ReportError("Choose a group.");
  if (scope === "student" && !studentId)
    throw new ReportError("Choose a student.");
  const raw = query.modules;
  const selected = typeof raw === "string" ? [raw] : (raw ?? []);
  if (
    !selected.length ||
    selected.some((item) => !REPORT_MODULES.includes(item as ReportModule))
  )
    throw new ReportError("Choose at least one valid report section.");
  const from = text("from"),
    to = text("to");
  if (!parseClassDate(from) || !parseClassDate(to) || from > to)
    throw new ReportError("Choose a valid From / To date range.");
  const view = text("view") || "both";
  if (!["summary", "details", "both"].includes(view))
    throw new ReportError("Choose a valid report format.");
  const homeworkStatus = text("homeworkStatus"),
    timing = text("timing"),
    practiceMode = text("practiceMode");
  if (
    homeworkStatus &&
    !(HOMEWORK_REPORT_STATUSES as readonly string[]).includes(homeworkStatus)
  )
    throw new ReportError("Invalid homework status.");
  if (!["", "late", "on-time"].includes(timing))
    throw new ReportError("Invalid homework timing.");
  if (!["", "STANDARD", "REVIEW", "CHALLENGE"].includes(practiceMode))
    throw new ReportError("Invalid practice mode.");
  return {
    scope,
    groupId: scope === "group" ? groupId : "",
    studentId: scope === "student" ? studentId : "",
    modules: REPORT_MODULES.filter((section) => selected.includes(section)),
    from,
    to,
    view: view as ReportFilters["view"],
    homeworkStatus: selected.includes("homework") ? homeworkStatus : "",
    page: selected.includes("homework") ? text("page").slice(0, 80) : "",
    timing: selected.includes("homework")
      ? (timing as ReportFilters["timing"])
      : "",
    levelId:
      selected.includes("exam") || selected.includes("practice")
        ? text("levelId")
        : "",
    practiceMode: selected.includes("practice")
      ? (practiceMode as ReportFilters["practiceMode"])
      : "",
  };
}
/** Inclusive Dhaka calendar days represented by a half-open timestamp range. */
export function reportTimestampRange(
  filters: Pick<ReportFilters, "from" | "to">,
) {
  return {
    gte: new Date(`${filters.from}T00:00:00+06:00`),
    lt: new Date(
      new Date(`${filters.to}T00:00:00+06:00`).getTime() + 86_400_000,
    ),
  };
}
export function reportQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams({ generate: "1" });
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params.toString();
}
export interface ReportRow {
  id: string;
  module: ReportModule;
  studentId: string;
  student: string;
  date: string;
  group: string;
  label: string;
  status: string;
  mark: number | null;
  maximum: number | null;
  page?: string;
  attempt?: number;
  timing?: string;
  durationSeconds?: number | null;
  comment?: string;
  academicLevel?: string;
}
export function reportPercentage(mark: number, maximum: number): number | null {
  return maximum > 0 ? Math.round((mark / maximum) * 10_000) / 100 : null;
}
export function summarizeReport(
  rows: ReportRow[],
  subjects: { id: string; name: string }[] = [],
  modules: ReportModule[] = [],
) {
  const buckets = new Map<
    string,
    {
      module: ReportModule;
      studentId: string;
      student: string;
      records: number;
      graded: number;
      totalMark: number;
      totalMaximum: number;
      statuses: Record<string, number>;
    }
  >();
  for (const subject of subjects)
    for (const section of modules)
      buckets.set(`${section}:${subject.id}`, {
        module: section,
        studentId: subject.id,
        student: subject.name,
        records: 0,
        graded: 0,
        totalMark: 0,
        totalMaximum: 0,
        statuses: {},
      });
  for (const row of rows) {
    const key = `${row.module}:${row.studentId}`;
    const bucket = buckets.get(key) ?? {
      module: row.module,
      studentId: row.studentId,
      student: row.student,
      records: 0,
      graded: 0,
      totalMark: 0,
      totalMaximum: 0,
      statuses: {},
    };
    bucket.records++;
    bucket.statuses[row.status] = (bucket.statuses[row.status] ?? 0) + 1;
    if (row.mark !== null && row.maximum !== null) {
      bucket.graded++;
      bucket.totalMark = Math.round((bucket.totalMark + row.mark) * 100) / 100;
      bucket.totalMaximum =
        Math.round((bucket.totalMaximum + row.maximum) * 100) / 100;
    }
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((row) => ({
    ...row,
    percentage: reportPercentage(row.totalMark, row.totalMaximum),
  }));
}
export function homeworkReportStatus(
  status: string | undefined,
  opensAt: Date,
  dueAt: Date,
  now: Date,
): string {
  if (!status)
    return opensAt > now ? "UPCOMING" : dueAt < now ? "MISSING" : "NOT_STARTED";
  return status === "IN_PROGRESS" && dueAt < now ? "INCOMPLETE" : status;
}
/** Quote formula-like user text as text when opening CSV in a spreadsheet. */
export function safeReportCsvCell(value: string): string {
  return /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)
    ? `'${value}`
    : value;
}
export function reportToCsv(
  rows: ReportRow[],
  filters: ReportFilters,
  generatedAt: string,
  subjects: { id: string; name: string }[] = [],
  context?: { institute: string; subject: string },
): string {
  const out: (string | number | null)[][] = [
    ["Generated at (UTC)", generatedAt],
    ["From", filters.from, "To", filters.to],
    [
      "Institute",
      context?.institute ?? "",
      "Report for",
      context?.subject ?? "",
    ],
    [
      "Scope",
      filters.scope,
      "Group ID",
      filters.groupId,
      "Student ID",
      filters.studentId,
    ],
    ["Sections", filters.modules.map((m) => REPORT_LABELS[m]).join(", ")],
    [
      "Date basis",
      "Class date; homework due date; exam/practice submission date (Asia/Dhaka)",
    ],
    [
      "Homework score rule",
      "Only latest approved attempt contributes to score; other statuses remain ungraded",
    ],
    [
      "Homework status filter",
      filters.homeworkStatus || "All",
      "Page",
      filters.page || "All",
      "Timing",
      filters.timing || "All",
    ],
    [
      "Sub-level ID",
      filters.levelId || "All",
      "Practice mode",
      filters.practiceMode || "All",
    ],
  ];
  if (filters.view !== "details") {
    const summaryHeaders = [
      "Section",
      "Student",
      "Records",
      "Graded",
      "Score",
      "Maximum",
      "Percentage",
      "Status counts",
      "Pass rate %",
      "Attendance %",
    ];
    const totals = summarizeReport(
      rows.map((row) => ({
        ...row,
        studentId: "total",
        student: "Section total",
      })),
      [{ id: "total", name: "Section total" }],
      filters.modules,
    );
    for (const [label, summaries] of [
      ["SECTION TOTALS", totals],
      ["STUDENT SUMMARY", summarizeReport(rows, subjects, filters.modules)],
    ] as const) {
      out.push([], [label], summaryHeaders);
      for (const summary of summaries)
        out.push([
          REPORT_LABELS[summary.module],
          summary.student,
          summary.records,
          summary.graded,
          summary.graded ? summary.totalMark : null,
          summary.graded ? summary.totalMaximum : null,
          summary.percentage,
          JSON.stringify(summary.statuses),
          summary.module === "exam" || summary.module === "practice"
            ? reportPercentage(summary.statuses.PASSED || 0, summary.records)
            : null,
          summary.module === "class"
            ? reportPercentage(
                summary.statuses.PRESENT || 0,
                (summary.statuses.PRESENT || 0) +
                  (summary.statuses.ABSENT || 0),
              )
            : null,
        ]);
    }
  }
  if (filters.view !== "summary") {
    out.push(
      [],
      ["DATE-WISE DETAILS"],
      [
        "Section",
        "Student",
        "Date",
        "Group / attribution",
        "Record",
        "Status",
        "Score",
        "Maximum",
        "Percentage",
        "Page",
        "Attempt",
        "Timing",
        "Duration seconds",
        "Academic Level snapshot",
        "Comment",
      ],
    );
    for (const row of rows)
      out.push([
        REPORT_LABELS[row.module],
        row.student,
        row.date,
        row.group,
        row.label,
        row.status,
        row.mark,
        row.maximum,
        row.mark !== null && row.maximum !== null
          ? reportPercentage(row.mark, row.maximum)
          : null,
        row.page ?? "",
        row.attempt ?? null,
        row.timing ?? "",
        row.durationSeconds ?? null,
        row.academicLevel ?? "",
        row.comment ?? "",
      ]);
  }
  return rowsToCsv(
    ["Performance report"],
    out.map((row) =>
      row.map((cell) =>
        typeof cell === "string" ? safeReportCsvCell(cell) : cell,
      ),
    ),
  );
}
