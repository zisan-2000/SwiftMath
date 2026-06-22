import type { Metadata } from "next";
import type { ReactNode } from "react";

import { instituteTitleMetadata } from "@/lib/institute-metadata";

/** Per-institute white-label title template for the admin area. */
export function generateMetadata(): Promise<Metadata> {
  return instituteTitleMetadata();
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
