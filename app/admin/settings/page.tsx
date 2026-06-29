import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { getInstituteBranding } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { InstituteSettingsForm } from "@/components/admin/institute-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const admin = await requireRole(Role.ADMIN);
  const institute = await getInstituteBranding(admin);

  if (!institute) {
    throw new Error("Institute not found.");
  }

  return (
    <AppShell
      user={admin}
      instituteName={institute.name}
      instituteLogoUrl={institute.logoUrl}
      title="Institute settings"
      subtitle="Update your institute name, tagline, and logo."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" aria-hidden />
            White-label branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          {institute.logoUrl ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={institute.logoUrl}
                alt=""
                className="size-10 rounded-md object-contain"
              />
              <p className="text-sm text-muted-foreground">
                Current logo preview — shown in the sidebar for your institute.
              </p>
            </div>
          ) : null}

          <InstituteSettingsForm institute={institute} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
