import type { Metadata } from "next";
import type { ReactNode } from "react";

import { instituteTitleMetadata } from "@/lib/institute-metadata";

/** Per-institute white-label title template for the student area. */
export function generateMetadata(): Promise<Metadata> {
  return instituteTitleMetadata();
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  return children;
}
