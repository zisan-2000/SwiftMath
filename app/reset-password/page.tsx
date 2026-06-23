import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sigma } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
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
    <main className="relative flex min-h-svh flex-1 items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sigma className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a new password for your account.
          </p>
        </div>

        <Card className="border-border/80 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur-sm">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
