import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { can } from "@/server/permissions";
import {
  buildPerformanceReport,
  validateReportExportScope,
} from "@/server/reports";
import {
  parseReportFilters,
  ReportError,
  reportToCsv,
  type ReportQuery,
} from "@/lib/reports";
import { slugifyFilename } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** UI downloads its already generated snapshot after a fresh authorization check.
 * No client-supplied marks are accepted or stored, and no scores are regenerated.
 */
export async function POST(request: Request) {
  const user = await requirePermission(PERMISSIONS.REPORT_VIEW);
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (
    !["ADMIN", "TEACHER"].includes(user.role) ||
    !(await can(user, PERMISSIONS.REPORT_EXPORT))
  ) {
    return Response.json(
      { error: "Report export is not permitted." },
      { status: 403, headers },
    );
  }
  try {
    const body = await request.json();
    if (body.ownerId !== user.id)
      return Response.json(
        {
          error:
            "Sign in to the account that generated this report, or generate a new report.",
        },
        { status: 403, headers },
      );
    const filters = parseReportFilters(body.filters);
    await validateReportExportScope(user, filters);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    if (
      error instanceof ReportError ||
      error instanceof SyntaxError ||
      error instanceof TypeError
    )
      return Response.json(
        {
          error:
            error instanceof ReportError
              ? error.message
              : "Invalid export request.",
        },
        { status: 400, headers },
      );
    throw error;
  }
}
export async function GET(request: Request) {
  const user = await requirePermission(PERMISSIONS.REPORT_VIEW);
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (
    !["ADMIN", "TEACHER"].includes(user.role) ||
    !(await can(user, PERMISSIONS.REPORT_EXPORT))
  )
    return Response.json(
      { error: "Report export is not permitted." },
      { status: 403, headers },
    );
  const params = new URL(request.url).searchParams;
  const query: ReportQuery = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }
  try {
    const report = await buildPerformanceReport(
      user,
      parseReportFilters(query),
    );
    return new Response(
      reportToCsv(
        report.rows,
        report.filters,
        report.generatedAt,
        report.subjects,
        { institute: report.institute.name, subject: report.subject },
      ),
      {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slugifyFilename(report.subject)}-report-${report.filters.from}-${report.filters.to}.csv"`,
        },
      },
    );
  } catch (error) {
    if (error instanceof ReportError)
      return Response.json({ error: error.message }, { status: 400, headers });
    throw error;
  }
}
