import { APP_NAME } from "@/lib/constants";
import { ShareInstallPanel } from "@/components/pwa/share-install-panel";

interface ShareInstallPanelLoaderProps {
  appName?: string;
}

/** Resolves public origin from env for admin/teacher share cards. */
export function ShareInstallPanelLoader({
  appName = APP_NAME,
}: ShareInstallPanelLoaderProps) {
  const origin =
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <ShareInstallPanel
      origin={origin}
      appName={appName}
      handoutHref="/help/student-install"
    />
  );
}
