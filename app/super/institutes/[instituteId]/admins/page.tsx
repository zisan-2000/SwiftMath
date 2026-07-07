import type { Metadata } from "next";

import { loadSuperInstitutePageContext } from "@/server/super-page";
import { SuperInstituteShell } from "@/components/super/super-institute-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck } from "lucide-react";
import { resetInstituteAdminPasswordAction } from "../actions";

export const metadata: Metadata = {
  title: "Institute admins",
};

export default async function SuperInstituteAdminsPage({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}) {
  const { instituteId } = await params;
  const { user, institute, admins } =
    await loadSuperInstitutePageContext(instituteId);

  return (
    <SuperInstituteShell
      user={user}
      instituteId={instituteId}
      instituteName={institute.name}
      subtitle="Institute admin accounts — reset passwords for support."
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Institute admins ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {admins.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ShieldCheck}
                title="No admin accounts"
                description="This institute has no ADMIN users. Create one when provisioning a new tenant."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {admins.map((admin) => (
                <li
                  key={admin.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-foreground">
                      {admin.name}
                      {!admin.isActive && (
                        <Badge variant="muted">Disabled</Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {admin.email}
                    </p>
                  </div>
                  <ResetPasswordForm
                    action={resetInstituteAdminPasswordAction.bind(
                      null,
                      institute.id,
                      admin.id,
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </SuperInstituteShell>
  );
}
