import type { Metadata } from "next";

import { loadSuperInstitutePageContext } from "@/server/super-page";
import { SuperInstituteShell } from "@/components/super/super-institute-shell";
import { EditInstituteForm } from "@/components/super/edit-institute-form";
import { InstituteActiveToggle } from "@/components/super/institute-active-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Institute settings",
};

export default async function SuperInstituteSettingsPage({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}) {
  const { instituteId } = await params;
  const { user, institute } = await loadSuperInstitutePageContext(instituteId);

  return (
    <SuperInstituteShell
      user={user}
      instituteId={instituteId}
      instituteName={institute.name}
      subtitle="Edit identity, branding, and platform access for this institute."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Institute details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditInstituteForm
            institute={{
              id: institute.id,
              name: institute.name,
              slug: institute.slug,
              tagline: institute.tagline,
              logoUrl: institute.logoUrl,
            }}
          />
        </CardContent>
      </Card>

      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Platform access</CardTitle>
          <p className="text-sm text-muted-foreground">
            Disabling an institute blocks every member&apos;s app access and
            revokes their sessions immediately.
          </p>
        </CardHeader>
        <CardContent>
          <InstituteActiveToggle
            instituteId={institute.id}
            isActive={institute.isActive}
          />
        </CardContent>
      </Card>
    </SuperInstituteShell>
  );
}
