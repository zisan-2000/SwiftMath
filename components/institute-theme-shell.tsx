import type { ReactNode } from "react";

import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { InstituteTheme } from "@/components/institute-theme";

/** Wrap tenant routes with per-institute primary color CSS variables. */
export async function InstituteThemeShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role === Role.SUPER_ADMIN) {
    return children;
  }

  const institute = await prisma.institute.findUnique({
    where: { id: user.instituteId },
    select: { primaryColor: true },
  });

  return (
    <InstituteTheme primaryColor={institute?.primaryColor}>
      {children}
    </InstituteTheme>
  );
}
