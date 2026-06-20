import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sigma } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: `Sign in · ${APP_NAME}`,
};

/**
 * Login page. The form is a client component that reads `?redirect=` via
 * useSearchParams, so it must sit inside a <Suspense> boundary.
 */
export default async function LoginPage({
  searchParams,
}: {
  // Next.js 16: searchParams is async.
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { disabled } = await searchParams;

  // Send genuinely signed-in users to their dashboard. This uses a REAL session
  // lookup (not just cookie presence) so a stale cookie shows the form instead
  // of bouncing back and forth with the protected routes.
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHomePath(user.role));
  }

  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sigma className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {disabled && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Your account has been disabled. Contact your institute administrator.
          </div>
        )}

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
