import type { CSSProperties, ReactNode } from "react";

import { buildInstituteThemeVariables } from "@/lib/institute-theme";

/** Applies institute `--primary` overrides to all descendant UI. */
export function InstituteTheme({
  primaryColor,
  children,
}: {
  primaryColor?: string | null;
  children: ReactNode;
}) {
  const variables = buildInstituteThemeVariables(primaryColor);
  if (!variables) return children;

  return (
    <div style={variables as CSSProperties} className="min-h-svh">
      {children}
    </div>
  );
}
