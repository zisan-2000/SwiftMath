import type { Metadata } from "next";

import { loadStudentPageContext } from "@/server/student-page";
import { StudentPageShell } from "@/components/student/student-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { InstallGuidePage } from "@/components/pwa/install-guide-page";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Install app",
};

/** Permanent student install guide — reopenable from Account or nav. */
export default async function StudentInstallHelpPage() {
  const { student, institute } = await loadStudentPageContext();

  return (
    <StudentPageShell
      user={student}
      institute={institute}
      title="Install on your phone"
      subtitle="Add the app to your home screen for faster practice and exam reminders."
    >
      <BackLink href="/student">Back to home</BackLink>
      <div className="mt-6 max-w-2xl">
        <InstallGuidePage appName={institute?.name ?? APP_NAME} />
      </div>
    </StudentPageShell>
  );
}
