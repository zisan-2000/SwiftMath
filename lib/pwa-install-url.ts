import { APP_NAME } from "@/lib/constants";

/** Public student install guide — shareable by teachers and admins. */
export function buildStudentInstallHelpUrl(origin: string): string {
  return `${normalizeOrigin(origin)}/student/help/install`;
}

/** Opens the auto-prompt sheet when the student is eligible. */
export function buildStudentInstallPromptUrl(origin: string): string {
  return `${buildStudentInstallHelpUrl(origin)}?install=1`;
}

export function buildWhatsAppShareText(
  installUrl: string,
  appName: string = APP_NAME,
): string {
  return [
    `${appName} — phone-এ app হিসেবে যোগ করুন`,
    "",
    installUrl,
    "",
    "iPhone: Safari → Share → Add to Home Screen",
    "Android: Chrome menu → Install app / Add to Home screen",
  ].join("\n");
}

export function buildWhatsAppShareUrl(
  installUrl: string,
  appName: string = APP_NAME,
): string {
  return `https://wa.me/?text=${encodeURIComponent(
    buildWhatsAppShareText(installUrl, appName),
  )}`;
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}
