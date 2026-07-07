import type { Metadata } from "next";

import { loadSuperInstitutePageContext } from "@/server/super-page";
import { SuperInstituteShell } from "@/components/super/super-institute-shell";
import { AddInstituteAdminForm } from "@/components/super/add-institute-admin-form";
import { AdminActiveToggle } from "@/components/super/admin-active-toggle";
import { PermissionControlsPanel } from "@/components/permission-controls-panel";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck } from "lucide-react";
import {
  resetInstituteAdminPasswordAction,
  setInstituteAdminPermissionAction,
} from "../actions";

export const metadata: Metadata = {
  title: "Institute admins",
};

export default async function SuperInstituteAdminsPage({
  params,
}: {
  params: Promise<{ instituteId: string }>;
}) {
  const { instituteId } = await params;
  const { user, institute, admins, adminPermissions } =
    await loadSuperInstitutePageContext(instituteId);

  return (
    <SuperInstituteShell
      user={user}
      instituteId={instituteId}
      instituteName={institute.name}
      subtitle="Create admins, reset access, and tune institute capabilities."
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Create admin</CardTitle>
          <CardDescription>
            Provision another institute admin with a temporary password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddInstituteAdminForm instituteId={institute.id} />
        </CardContent>
      </Card>

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
                  className="px-5 py-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <ResetPasswordForm
                        action={resetInstituteAdminPasswordAction.bind(
                          null,
                          institute.id,
                          admin.id,
                        )}
                      />
                      <AdminActiveToggle
                        instituteId={institute.id}
                        userId={admin.id}
                        isActive={admin.isActive}
                      />
                    </div>
                  </div>

                  <PermissionControlsPanel
                    title="Admin capabilities"
                    description="Limit this admin's institute-scoped access."
                    emptyTitle="No admin permissions"
                    emptyDescription="There are no configurable admin permissions."
                    permissions={adminPermissions[admin.id] ?? []}
                    action={setInstituteAdminPermissionAction.bind(
                      null,
                      institute.id,
                      admin.id,
                    )}
                    framed={false}
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
