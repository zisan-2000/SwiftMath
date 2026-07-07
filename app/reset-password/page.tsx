import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { SetNewPasswordForm } from "@/components/auth/set-new-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

/**
 * Landing page for the password-reset email link. better-auth validates the
 * token and redirects here with `?token=…` (or `?error=INVALID_TOKEN`).
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHomePath(user.role));
  }

  const { token, error } = await searchParams;
  const invalid = error === "INVALID_TOKEN" || !token;

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
      contentId="reset-password-form"
    >
      {invalid ? (
        <div className="flex flex-col gap-4">
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            This reset link is invalid or has expired.
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <SetNewPasswordForm token={token} />
      )}
    </AuthShell>
  );
}
