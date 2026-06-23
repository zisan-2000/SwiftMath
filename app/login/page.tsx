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
  searchParams: Promise<{ disabled?: string; reset?: string }>;
}) {
  const { disabled, reset } = await searchParams;

  // Send genuinely signed-in users to their dashboard. This uses a REAL session
  // lookup (not just cookie presence) so a stale cookie shows the form instead
  // of bouncing back and forth with the protected routes.
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHomePath(user.role));
  }

  return (
    <main className="relative flex min-h-svh flex-1 items-center justify-center px-6 py-16">
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to sign in
      </a>
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
          <div
            role="alert"
            className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
          >
            Your account has been disabled. Contact your institute administrator.
          </div>
        )}

        {reset && (
          <div
            role="status"
            className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-foreground"
          >
            Your password was updated. Sign in with your new password.
          </div>
        )}

        <Card
          id="login-form"
          className="border-border/80 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur-sm"
        >
          <CardContent className="p-6">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
