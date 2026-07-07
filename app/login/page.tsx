import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
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
    <AuthShell
      title={APP_NAME}
      subtitle="Sign in to your account"
      contentId="login-form"
      skipLabel="Skip to sign in"
      banner={
        <>
          {disabled && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
            >
              Your account has been disabled. Contact your institute
              administrator.
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
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
