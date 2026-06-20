"use client";

// Thin wrapper around next-themes so the rest of the app can stay server-first.
// Mounted once in the root layout; it toggles a `class` (light/dark) on <html>,
// which our token-based globals.css reacts to.

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
