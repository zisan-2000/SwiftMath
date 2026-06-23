"use client";

import { useState } from "react";
import Link from "next/link";

import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/**
 * Self-service "forgot password" form. Calls better-auth's
 * `/request-password-reset` endpoint. Always shows a generic success message
 * (does not reveal whether the email exists).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await requestPasswordReset({
      email: email.trim(),
      redirectTo,
    });

    if (resetError) {
      setError("Something went wrong. Please try again later.");
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we sent a reset link. Check your
          inbox (and spam folder). The link expires in one hour.
        </p>
        <p className="text-xs text-muted-foreground">
          Local dev without <code className="text-foreground">RESEND_API_KEY</code>
          ? Copy the reset link from your terminal where{" "}
          <code className="text-foreground">npm run dev</code> is running.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}

      <Button type="submit" disabled={submitting} className="mt-2 w-full">
        {submitting ? "Sending…" : "Send reset link"}
      </Button>

      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </form>
  );
}
