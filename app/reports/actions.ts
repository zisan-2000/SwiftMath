"use server";

import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import {
  parseReportFilters,
  reportFormQuery,
  ReportError,
} from "@/lib/reports";
import { buildPerformanceReport } from "@/server/reports";
import { can } from "@/server/permissions";

export async function generatePerformanceReportAction(form: FormData) {
  const user = await requirePermission(PERMISSIONS.REPORT_VIEW);
  try {
    const report = await buildPerformanceReport(
      user,
      parseReportFilters(reportFormQuery(form)),
    );
    return {
      ok: true as const,
      report,
      ownerId: user.id,
      exportAllowed: await can(user, PERMISSIONS.REPORT_EXPORT),
    };
  } catch (error) {
    if (error instanceof ReportError)
      return { ok: false as const, error: error.message };
    console.error("[reports] generation failed", error);
    return {
      ok: false as const,
      error: "Unable to generate the report. Please try again.",
    };
  }
}
