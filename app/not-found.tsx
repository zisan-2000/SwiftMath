import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Root 404 page. Shown when `notFound()` is called (e.g. an admin opens a level
 * id that isn't in their institute) or for unmatched routes. Kept self-contained
 * (no AppShell) since it can render outside an authenticated context.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <Badge variant="muted">404</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          The page you’re looking for doesn’t exist or you don’t have access to
          it.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Go to {APP_NAME}</Link>
        </Button>
      </main>
    </div>
  );
}
