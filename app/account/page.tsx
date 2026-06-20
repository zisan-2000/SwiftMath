import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: `Account · ${APP_NAME}`,
};

/**
 * Account settings, available to every signed-in user regardless of role.
 * Phase 1 scope: change your own password.
 */
export default async function AccountPage() {
  const user = await requireUser();

  const institute = await prisma.institute.findUnique({
    where: { id: user.instituteId },
    select: { name: true },
  });

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      title="Account"
      subtitle="Manage your sign-in details."
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="mt-1 font-medium text-foreground">{user.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="mt-1 font-medium text-foreground">{user.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Role</p>
            <div className="mt-1">
              <Badge variant="secondary">{user.role}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
