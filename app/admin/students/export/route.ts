import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import {
  buildInstituteStudentReport,
  instituteStudentReportFilename,
  instituteStudentReportToCsv,
} from "@/server/admin-report";

/** ADMIN → download institute-wide student progress as CSV. */
export async function GET() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, rows] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    buildInstituteStudentReport(admin),
  ]);

  const csv = instituteStudentReportToCsv(rows);
  const filename = instituteStudentReportFilename(
    institute?.name ?? "institute",
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
