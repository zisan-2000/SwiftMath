import type { Metadata } from "next";

import { Role } from "@/lib/generated/prisma/enums";
import { APP_NAME } from "@/lib/constants";
import { roleHasNotificationInbox } from "@/lib/notifications";
import { roleHomePath, roleLabel } from "@/lib/roles";
import { listNotificationPreferencesForUser } from "@/server/notification-preferences";
import { loadAccountPageContext } from "@/server/account-page";
import { AccountPageShell } from "@/components/account/account-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { NotificationPreferencesPanel } from "@/components/account/notification-preferences-panel";
import { GetAppPanel } from "@/components/account/get-app-panel";
import { PushNotificationPanel } from "@/components/account/push-notification-panel";
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
  const { user, institute } = await loadAccountPageContext();

  const notificationPreferences = roleHasNotificationInbox(user.role)
    ? await listNotificationPreferencesForUser({
        userId: user.id,
        instituteId: user.instituteId,
        role: user.role,
      })
    : [];

  return (
    <AccountPageShell user={user} institute={institute}>
      <BackLink href={roleHomePath(user.role)}>Back to dashboard</BackLink>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Profile
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="mt-1 font-medium text-foreground">{user.name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 break-all font-medium text-foreground">
                {user.email}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Role</p>
              <div className="mt-1">
                <Badge variant="secondary">{roleLabel(user.role)}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Security
        </h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </section>

      {user.role === Role.STUDENT ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mobile app
          </h2>
          <Card className="max-w-2xl">
            <CardContent className="p-5">
              <GetAppPanel appName={institute?.name ?? APP_NAME} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Alerts
        </h2>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Alert sound</CardTitle>
            <p className="text-sm text-muted-foreground">
              Play a short chime when important notifications arrive (exams,
              level-ups).
            </p>
          </CardHeader>
          <CardContent>
            <NotificationSoundPanel />
          </CardContent>
        </Card>

        {roleHasNotificationInbox(user.role) ? (
          <Card id="browser-push" className="mt-4 max-w-2xl scroll-mt-24">
            <CardHeader>
              <CardTitle className="text-base">Push notifications</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browser-level alerts for reminders and high-priority updates.
              </p>
            </CardHeader>
            <CardContent>
              <PushNotificationPanel />
            </CardContent>
          </Card>
        ) : null}

        {notificationPreferences.length > 0 ? (
          <Card className="mt-4 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Notification preferences</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose which in-app alerts you receive. Existing notifications
                stay in your inbox; muting only stops new ones.
              </p>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesPanel
                preferences={notificationPreferences}
              />
            </CardContent>
          </Card>
        ) : null}
      </section>
    </AccountPageShell>
  );
}
