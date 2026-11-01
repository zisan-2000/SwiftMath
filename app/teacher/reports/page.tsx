import type { Metadata } from "next";
import { ReportBuilderPage } from "@/components/reports/report-builder-page";
import type { ReportQuery } from "@/lib/reports";
export const metadata: Metadata = { title: "Reports" };
export default function TeacherReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportQuery>;
}) {
  return <ReportBuilderPage role="TEACHER" searchParams={searchParams} />;
}
