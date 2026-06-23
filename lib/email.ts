// Outbound email for auth flows (Phase 2.4).
//
// Production: Resend (`RESEND_API_KEY` + verified `EMAIL_FROM` domain).
// Local dev: if no API key, logs the message + reset link to the terminal so
// forgot-password can be tested without an email provider.

import "server-only";

export interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
}

/**
 * Send the password-reset email. Never throws to the caller for a missing user
 * — better-auth already returns a generic success. Throws only on a configured
 * provider failure so the API can surface a 500.
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams,
): Promise<void> {
  const { to, userName, resetUrl } = params;
  const subject = "Reset your password";
  const html = `
    <p>Hi ${escapeHtml(userName)},</p>
    <p>We received a request to reset your password. Click the link below to choose a new one. This link expires in one hour.</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `.trim();
  const text = `Hi ${userName},\n\nReset your password: ${resetUrl}\n\nIf you did not request this, ignore this email.`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // Dev fallback — copy the link from the terminal.
    console.log("\n--- [dev] Password reset email (no RESEND_API_KEY) ---");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link:    ${resetUrl}`);
    console.log("---\n");
    return;
  }

  const from =
    process.env.EMAIL_FROM?.trim() ?? "SEFT Abacus <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend error ${response.status}: ${body}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Public app origin for auth redirect URLs (no trailing slash). */
export function getAppOrigin(): string {
  const url = process.env.BETTER_AUTH_URL?.trim() ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}
