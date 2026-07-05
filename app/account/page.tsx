import type { Metadata } from "next";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleHasNotificationInbox } from "@/lib/notifications";
import { listNotificationPreferencesForUser } from "@/server/notification-preferences";
import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { NotificationPreferencesPanel } from "@/components/account/notification-preferences-panel";
import { NotificationSoundPanel } from "@/components/account/notification-sound-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Account",
};

/**
 * Account settings, available to every signed-in user regardless of role.
 * Phase 1 scope: change password + notification preferences (N7).
 */
export default async function AccountPage() {
  const user = await requireUser();

  const [institute, notificationPreferences] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: user.instituteId },
      select: { name: true, logoUrl: true },
    }),
    roleHasNotificationInbox(user.role)
      ? listNotificationPreferencesForUser({
          userId: user.id,
          instituteId: user.instituteId,
          role: user.role,
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Account"
      subtitle="Manage your sign-in details and notification preferences."
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

      <Card className="mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Alert sound</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSoundPanel />
        </CardContent>
      </Card>

      {notificationPreferences.length > 0 ? (
        <Card className="mt-8 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Notification preferences</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose which in-app alerts you receive. Existing notifications stay
              in your inbox; muting only stops new ones.
            </p>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesPanel preferences={notificationPreferences} />
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
