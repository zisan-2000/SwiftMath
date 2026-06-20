import Link from "next/link";
import { Sigma } from "lucide-react";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Public landing page.
 *
 * Phase 1: a branded entry point into the app. Role-based dashboards live
 * behind sign-in.
 */
export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <main className="relative flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sigma className="h-7 w-7" />
        </span>

        <Badge variant="secondary">Phase 1 · MVP</Badge>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {APP_NAME}
        </h1>

        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          {APP_TAGLINE}
        </p>

        <Button asChild size="lg" className="mt-2">
          <Link href="/login">Sign in</Link>
        </Button>
      </main>
    </div>
  );
}
