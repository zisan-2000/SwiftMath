"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  REPORT_LABELS,
  reportPercentage,
  summarizeReport,
  type ReportRow,
} from "@/lib/reports";
import { formatHomeworkDuration } from "@/lib/homework-presentation";
import { formatDhakaDateTime } from "@/lib/homework-schedule";
import type { PerformanceReport } from "@/server/reports";

const pct = (value: number | null) =>
  value === null ? "N/A" : `${value.toFixed(2)}%`;
const mark = (row: { mark: number | null; maximum: number | null }) =>
  row.mark === null || row.maximum === null
    ? "Not graded"
    : `${row.mark} / ${row.maximum}`;
function Pagination({
  label,
  count,
  page,
  onChange,
}: {
  label: string;
  count: number;
  page: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / 25));
  return (
    <div
      className="report-screen-only mb-4 flex flex-wrap items-center justify-between gap-2 text-xs"
      aria-label={`${label} pagination`}
    >
      <p>
        {count
          ? `${page * 25 + 1}–${Math.min((page + 1) * 25, count)} of ${count}`
          : "0 records"}{" "}
        · Page {page + 1} of {pages}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page === 0}
            aria-label={`Previous ${label} page`}
            onClick={() => onChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page + 1 >= pages}
            aria-label={`Next ${label} page`}
            onClick={() => onChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      variant={
        ["APPROVED", "PASSED", "PRESENT"].includes(value)
          ? "success"
          : ["REJECTED", "FAILED", "ABSENT", "MISSING"].includes(value)
            ? "destructive"
            : ["INCOMPLETE", "RESUBMISSION_REQUESTED", "IN_PROGRESS"].includes(
                  value,
                )
              ? "warning"
              : "muted"
      }
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
export function ReportDocument({
  report,
  printing = false,
}: {
  report: PerformanceReport;
  printing?: boolean;
}) {
  const { filters, rows, subjects } = report;
  const [summaryPage, setSummaryPage] = useState(0);
  const [detailPage, setDetailPage] = useState(0);
  const summaries = useMemo(
    () => summarizeReport(rows, subjects, filters.modules),
    [rows, subjects, filters.modules],
  );
  const visibleSummaries = printing
    ? summaries
    : summaries.slice(summaryPage * 25, (summaryPage + 1) * 25);
  const visibleRows = printing
    ? rows
    : rows.slice(detailPage * 25, (detailPage + 1) * 25);
  const totals = useMemo(
    () =>
      summarizeReport(
        rows.map((row) => ({
          ...row,
          studentId: "total",
          student: "Section total",
        })),
        [{ id: "total", name: "Section total" }],
        filters.modules,
      ),
    [rows, filters.modules],
  );
  return (
    <article className="report-document min-w-0 rounded-xl border bg-card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start gap-4 border-b pb-4">
        {report.institute.logoUrl && (
          <Image
            src={report.institute.logoUrl}
            alt={`${report.institute.name} logo`}
            width={100}
            height={60}
            unoptimized
            className="h-14 w-24 object-contain"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{report.institute.name}</h2>
          <h3 className="mt-1 text-lg font-semibold">
            Performance Report · {report.subject}
          </h3>
          <p className="text-sm">
            {filters.from} — {filters.to} · Bangladesh time
          </p>
          <p className="text-xs text-muted-foreground">
            Generated: {formatDhakaDateTime(new Date(report.generatedAt))}
          </p>
        </div>
      </div>
      <div
        className="mb-5 flex flex-wrap gap-2"
        aria-label="Applied report filters"
      >
        {filters.modules.map((module) => (
          <Badge key={module} variant="outline">
            {REPORT_LABELS[module]}
          </Badge>
        ))}
        {filters.homeworkStatus && (
          <Badge variant="outline">
            {filters.homeworkStatus.replaceAll("_", " ")}
          </Badge>
        )}
        {filters.page && <Badge variant="outline">Page: {filters.page}</Badge>}
        {filters.timing && <Badge variant="outline">{filters.timing}</Badge>}
        {report.levelName && (
          <Badge variant="outline">Sub-level: {report.levelName}</Badge>
        )}
        {filters.practiceMode && (
          <Badge variant="outline">{filters.practiceMode}</Badge>
        )}
      </div>
      {rows.length === 0 && (
        <p className="mb-5 rounded-md border p-4 text-sm">
          No records match these filters. N/A means no graded data; it does not
          mean zero performance.
        </p>
      )}
      {filters.view !== "details" && (
        <>
          <h3 className="mb-3 font-semibold">Section totals</h3>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {totals.map((total) => (
              <div key={total.module} className="rounded-lg border p-3 text-sm">
                <h4 className="font-semibold">{REPORT_LABELS[total.module]}</h4>
                <p>
                  {total.records} records · {total.graded} graded
                </p>
                <p className="font-medium">
                  {total.graded
                    ? `${total.totalMark} / ${total.totalMaximum}`
                    : "Not graded"}{" "}
                  · {pct(total.percentage)}
                </p>
                <p className="mt-1 text-xs">
                  {Object.entries(total.statuses)
                    .map(([s, n]) => `${s.replaceAll("_", " ")}: ${n}`)
                    .join(" · ") || "No data"}
                </p>
              </div>
            ))}
          </div>
          <h3 className="mb-3 font-semibold">Student summary</h3>
          {!printing && (
            <div className="report-mobile-summaries mb-4 grid gap-3 sm:hidden">
              {visibleSummaries.map((summary) => (
                <div
                  key={`${summary.module}:${summary.studentId}`}
                  className="min-w-0 rounded-lg border p-3 text-sm"
                >
                  <p className="break-words font-semibold">{summary.student}</p>
                  <p className="text-xs text-muted-foreground">
                    {REPORT_LABELS[summary.module]}
                  </p>
                  <p className="mt-2 font-medium">
                    {summary.graded
                      ? `${summary.totalMark} / ${summary.totalMaximum}`
                      : "Not graded"}{" "}
                    · {pct(summary.percentage)}
                  </p>
                  <p className="text-xs">
                    {summary.records} records · {summary.graded} graded
                  </p>
                  <p className="mt-1 text-xs">
                    {Object.entries(summary.statuses)
                      .map(
                        ([status, count]) =>
                          `${status.replaceAll("_", " ")}: ${count}`,
                      )
                      .join(" · ") || "No data"}
                  </p>
                  {summary.module === "class" && (
                    <p className="mt-1 text-xs">
                      Attendance:{" "}
                      {pct(
                        reportPercentage(
                          summary.statuses.PRESENT || 0,
                          (summary.statuses.PRESENT || 0) +
                            (summary.statuses.ABSENT || 0),
                        ),
                      )}
                    </p>
                  )}
                  {(summary.module === "exam" ||
                    summary.module === "practice") && (
                    <p className="mt-1 text-xs">
                      Pass rate:{" "}
                      {pct(
                        reportPercentage(
                          summary.statuses.PASSED || 0,
                          summary.records,
                        ),
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div
            className={`report-summary-table report-table-wrap mb-4 min-w-0 max-w-full overflow-x-auto overscroll-x-contain ${printing ? "" : "hidden sm:block"}`}
          >
            <table className="report-table w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <th className="report-identity">Student</th>
                  <th>Section</th>
                  <th>Records</th>
                  <th>Graded score</th>
                  <th>Percentage</th>
                  <th>Status / rates</th>
                </tr>
              </thead>
              <tbody>
                {visibleSummaries.map((summary) => (
                  <tr key={`${summary.module}:${summary.studentId}`}>
                    <td className="report-identity">{summary.student}</td>
                    <td>{REPORT_LABELS[summary.module]}</td>
                    <td>{summary.records}</td>
                    <td>
                      {summary.graded
                        ? `${summary.totalMark} / ${summary.totalMaximum}`
                        : "Not graded"}
                    </td>
                    <td>{pct(summary.percentage)}</td>
                    <td>
                      {Object.entries(summary.statuses)
                        .map(([s, n]) => `${s.replaceAll("_", " ")}: ${n}`)
                        .join(" · ") || "No data"}
                      {(summary.module === "practice" ||
                        summary.module === "exam") && (
                        <p className="mt-1 text-xs">
                          Pass rate:{" "}
                          {pct(
                            reportPercentage(
                              summary.statuses.PASSED || 0,
                              summary.records,
                            ),
                          )}
                        </p>
                      )}
                      {summary.module === "class" && (
                        <p className="mt-1 text-xs">
                          Attendance:{" "}
                          {pct(
                            reportPercentage(
                              summary.statuses.PRESENT || 0,
                              (summary.statuses.PRESENT || 0) +
                                (summary.statuses.ABSENT || 0),
                            ),
                          )}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="summary"
            count={summaries.length}
            page={summaryPage}
            onChange={setSummaryPage}
          />
        </>
      )}
      {filters.view !== "summary" && (
        <>
          <h3 className="mb-3 font-semibold">
            Date-wise details ({rows.length})
          </h3>
          <p className="report-screen-only mb-2 text-xs text-muted-foreground">
            Swipe the table to see all columns. Print / CSV includes all pages.
          </p>
          <div className="report-table-wrap min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
            <table className="report-table w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr>
                  <th className="report-identity">Student / Date</th>
                  <th>Section</th>
                  <th>Group / record</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status / details</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row: ReportRow) => (
                  <tr key={`${row.module}:${row.id}`}>
                    <td className="report-identity">
                      {row.student}
                      <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                        {row.date}
                      </p>
                    </td>
                    <td>{REPORT_LABELS[row.module]}</td>
                    <td>
                      {row.group}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.label}
                      </p>
                    </td>
                    <td>{mark(row)}</td>
                    <td>
                      {pct(
                        row.mark === null || row.maximum === null
                          ? null
                          : reportPercentage(row.mark, row.maximum),
                      )}
                    </td>
                    <td>
                      <Status value={row.status} />
                      {row.page && (
                        <p>
                          Page {row.page} · Attempt {row.attempt}
                        </p>
                      )}
                      {row.timing && <p>{row.timing}</p>}
                      {row.durationSeconds != null && (
                        <p>{formatHomeworkDuration(row.durationSeconds)}</p>
                      )}
                      {row.academicLevel && (
                        <p>Academic Level: {row.academicLevel}</p>
                      )}
                      {row.comment && (
                        <p className="mt-1 whitespace-pre-wrap">
                          {row.comment}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="details"
            count={rows.length}
            page={detailPage}
            onChange={setDetailPage}
          />
        </>
      )}
      <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
        Class, homework, exam and practice percentages are independent. No
        combined overall score is calculated.
      </p>
      <details
        open={printing || undefined}
        className="report-calculation-notes mt-3 text-xs text-muted-foreground"
      >
        <summary className="cursor-pointer font-medium">
          How these results are calculated
        </summary>
        <div className="mt-2 space-y-1">
          <p>
            Percentage = total graded score ÷ total graded maximum × 100. N/A
            means no graded data.
          </p>
          <p>
            Date basis: Class date · Homework due date · Exam / Practice
            submission date. Scores reflect the saved data when this report was
            generated.
          </p>
          {filters.modules.includes("class") && (
            <p>
              Attendance covers entered marks only. Not entered / no data is not
              absence.
            </p>
          )}
          {filters.modules.includes("homework") && (
            <>
              <p>
                Homework uses the latest attempt; only approved scores
                contribute to totals. Missing, incomplete and unreviewed
                homework remain ungraded. Missing counts only recorded student
                assignments. Archived history is included; cancelled occurrences
                are excluded.
              </p>
              {filters.scope === "group" && (
                <p>
                  Group homework covers group assignments. Use Individual
                  reports for individual assignments.
                </p>
              )}
            </>
          )}
          {filters.modules.includes("practice") &&
            filters.scope === "group" && (
              <p>
                Practice uses the student’s current group; historical group
                attribution is unavailable.
              </p>
            )}
        </div>
      </details>
    </article>
  );
}
