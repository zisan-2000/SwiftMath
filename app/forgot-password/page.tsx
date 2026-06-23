import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sigma } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

/**
 * Self-service password reset request. Public page — signed-in users are sent
 * to their dashboard (they can change password on /account instead).
 */
export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(roleHomePath(user.role));
  }

  return (
    <main className="relative flex min-h-svh flex-1 items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sigma className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Forgot password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <Card className="border-border/80 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <Suspense fallback={null}>
              <ForgotPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
