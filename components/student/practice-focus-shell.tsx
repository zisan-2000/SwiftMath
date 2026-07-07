import type { ReactNode } from "react";
import Link from "next/link";
import { Sigma, X } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

interface PracticeFocusShellProps {
  /** White-label institute name. */
  instituteName: string;
  /** Optional institute logo URL. */
  instituteLogoUrl?: string | null;
  /** Level / exam heading. */
  title: string;
  /** Short mode description under the title. */
  subtitle: string;
  /** Where the exit control goes (practice home or dashboard). */
  exitHref: string;
  /** Exit control label — hidden mid-exam to discourage accidental leaving. */
  exitLabel?: string;
  children: ReactNode;
}

/**
 * Distraction-free chrome for an active practice/exam session. No sidebar or
 * app navigation — just the brand, the level heading, and a single exit control
 * so the student focuses on answering.
 */
export function PracticeFocusShell({
  instituteName,
  instituteLogoUrl,
  title,
  subtitle,
  exitHref,
  exitLabel = "Exit",
  children,
}: PracticeFocusShellProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#practice-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to questions
      </a>

      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 lg:px-8">
          <span className="flex items-center gap-2.5">
            {instituteLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={instituteLogoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg border border-border object-contain"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sigma className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                {instituteName}
              </span>
              <span className="block text-xs leading-tight text-muted-foreground">
                {APP_NAME}
              </span>
            </span>
          </span>

          <Link
            href={exitHref}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
            {exitLabel}
          </Link>
        </div>
      </header>

      <main
        id="practice-main"
        className="flex-1 px-4 py-8 outline-none lg:px-8"
        tabIndex={-1}
      >
        <div className="mx-auto w-full max-w-3xl animate-in fade-in-50 duration-300">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
