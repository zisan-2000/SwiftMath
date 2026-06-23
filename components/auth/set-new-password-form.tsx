"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/**
 * Self-service form to set a new password using the token from the reset email
 * link. On success sends the user to `/login`.
 */
export function SetNewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error: resetError } = await resetPassword({
      newPassword: password,
      token,
    });

    if (resetError) {
      setError(
        resetError.message?.includes("INVALID") ||
          resetError.code === "INVALID_TOKEN"
          ? "This reset link is invalid or has expired. Request a new one."
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
      return;
    }

    router.replace("/login?reset=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}

      <Button type="submit" disabled={submitting} className="mt-2 w-full">
        {submitting ? "Saving…" : "Set new password"}
      </Button>

      <Button asChild variant="ghost" className="w-full">
        <Link href="/forgot-password">Request a new link</Link>
      </Button>
    </form>
  );
}
