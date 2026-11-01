import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReportWorkspace } from "@/components/reports/report-workspace";
import { PERMISSIONS } from "@/lib/permissions";
import { requireRole } from "@/lib/session";
import { can } from "@/server/permissions";
import { loadInstituteBranding } from "@/server/institute-branding";
import { buildPerformanceReport, getReportOptions } from "@/server/reports";
import {
  parseReportFilters,
  ReportError,
  type ReportQuery,
} from "@/lib/reports";

export async function ReportBuilderPage({
  role,
  searchParams,
}: {
  role: "ADMIN" | "TEACHER";
  searchParams: Promise<ReportQuery>;
}) {
  const user = await requireRole(role);
  if (!(await can(user, PERMISSIONS.REPORT_VIEW))) redirect("/403");
  const [query, options, institute, exportAllowed] = await Promise.all([
    searchParams,
    getReportOptions(user),
    loadInstituteBranding(user.instituteId),
    can(user, PERMISSIONS.REPORT_EXPORT),
  ]);
  let report: Awaited<ReturnType<typeof buildPerformanceReport>> | null = null;
  let error: string | null = null;
  if (query.generate === "1") {
    try {
      report = await buildPerformanceReport(user, parseReportFilters(query));
    } catch (cause) {
      if (cause instanceof ReportError) error = cause.message;
      else throw cause;
    }
  }
  const basePath = role === "ADMIN" ? "/admin/reports" : "/teacher/reports";
  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Reports"
      subtitle="Select a group or student, sections and dates to build your report."
    >
      <ReportWorkspace
        key={JSON.stringify(query)}
        options={options}
        query={query}
        basePath={basePath}
        initialReport={report}
        initialError={error}
        ownerId={user.id}
        exportAllowed={exportAllowed}
      />
    </AppShell>
  );
}
