import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send a reset link."
      contentId="forgot-password-form"
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
