import { Suspense } from "react";

import { Role } from "@/lib/generated/prisma/enums";
import { APP_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { StudentInstallPrompt } from "@/components/pwa/student-install-prompt";
import { InstallPushFollowup } from "@/components/pwa/install-push-followup";

/** Loads institute branding for the student install sheet. */
export async function StudentInstallPromptLoader() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.STUDENT) {
    return null;
  }

  const institute = await prisma.institute.findUnique({
    where: { id: user.instituteId },
    select: { name: true },
  });

  return (
    <Suspense fallback={null}>
      <StudentInstallPrompt appName={institute?.name ?? APP_NAME} />
      <InstallPushFollowup />
    </Suspense>
  );
}
