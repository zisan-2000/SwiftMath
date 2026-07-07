import type { Metadata } from "next";
import { GitBranch, Settings } from "lucide-react";

import {
  getActiveCurriculumVersion,
  listCurriculumVersions,
} from "@/server/curriculum-version";
import { getInstituteBranding } from "@/server/admin";
import { loadAdminPageContext } from "@/server/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { InstituteSettingsForm } from "@/components/admin/institute-settings-form";
import { CurriculumVersionPanel } from "@/components/admin/curriculum-version-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const { admin, institute: branding } = await loadAdminPageContext();

  const [institute, activeVersion, history] = await Promise.all([
    getInstituteBranding(admin),
    getActiveCurriculumVersion(admin.instituteId),
    listCurriculumVersions(admin),
  ]);

  if (!institute || !activeVersion) {
    throw new Error("Institute not found.");
  }

  return (
    <AdminPageShell
      user={admin}
      institute={branding}
      title="Institute settings"
      subtitle="Branding and curriculum generation."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" aria-hidden />
            White-label branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InstituteSettingsForm institute={institute} />
        </CardContent>
      </Card>

      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4" aria-hidden />
            Curriculum versioning
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control which question-bank generation is live for new practice and
            exams.
          </p>
        </CardHeader>
        <CardContent>
          <CurriculumVersionPanel
            active={{
              versionNumber: activeVersion.versionNumber,
              label: activeVersion.label,
              publishedAt: activeVersion.publishedAt,
              liveQuestionCount: activeVersion._count.levelQuestions,
            }}
            history={history.map((row) => ({
              versionNumber: row.versionNumber,
              label: row.label,
              publishedAt: row.publishedAt,
              questionCount: row._count.levelQuestions,
            }))}
          />
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
