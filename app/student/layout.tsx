import type { Metadata } from "next";
import type { ReactNode } from "react";

import { instituteTitleMetadata } from "@/lib/institute-metadata";
import { InstituteThemeShell } from "@/components/institute-theme-shell";

/** Per-institute white-label title template for the student area. */
export function generateMetadata(): Promise<Metadata> {
  return instituteTitleMetadata();
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <InstituteThemeShell>{children}</InstituteThemeShell>;
}
