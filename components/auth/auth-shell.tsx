import type { ReactNode } from "react";
import { Sigma } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AuthShellProps {
  /** Page heading (e.g. app name or "Forgot password"). */
  title: string;
  /** Short supporting line under the heading. */
  subtitle: string;
  /** id applied to the card and used as the skip-link target. */
  contentId?: string;
  /** Skip-link label; only rendered when `contentId` is provided. */
  skipLabel?: string;
  /** Optional alerts/banners rendered between the header and the card. */
  banner?: ReactNode;
  /** Card body (usually a form). */
  children: ReactNode;
}

/**
 * Shared chrome for the public auth pages (sign in, forgot / reset password):
 * a centered column with the brand badge, heading, optional banner, and a
 * frosted card. Keeps every entry point visually identical.
 */
export function AuthShell({
  title,
  subtitle,
  contentId,
  skipLabel = "Skip to form",
  banner,
  children,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-svh flex-1 items-center justify-center px-6 py-16">
      {contentId && (
        <a
          href={`#${contentId}`}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {skipLabel}
        </a>
      )}
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sigma className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {banner}

        <Card
          id={contentId}
          className="border-border/80 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur-sm"
        >
          <CardContent className="p-6">{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
