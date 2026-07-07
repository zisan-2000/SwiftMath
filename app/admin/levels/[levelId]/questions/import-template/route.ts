import { notFound } from "next/navigation";

import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { buildLevelQuestionImportTemplate } from "@/lib/level-question-csv";
import { slugifyFilename } from "@/lib/csv";
import { getLevel } from "@/server/admin";

/** ADMIN → download CSV template for bulk question import. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ levelId: string }> },
) {
  const { levelId } = await context.params;
  const admin = await requirePermission(PERMISSIONS.QUESTION_MANAGE);
  const level = await getLevel(admin, levelId);

  if (!level) {
    notFound();
  }

  const csv = buildLevelQuestionImportTemplate();
  const filename = `${slugifyFilename(level.name)}-question-import-template.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
