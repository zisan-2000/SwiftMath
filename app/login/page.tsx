import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: `Sign in · ${APP_NAME}`,
};

/**
 * Login page. The form is a client component that reads `?redirect=` via
 * useSearchParams, so it must sit inside a <Suspense> boundary.
 */
export default async function LoginPage() {
  // Send genuinely signed-in users to their dashboard. This uses a REAL session
  // lookup (not just cookie presence) so a stale cookie shows the form instead
  // of bouncing back and forth with the protected routes.
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHomePath(user.role));
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
