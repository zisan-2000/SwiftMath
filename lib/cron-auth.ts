// Shared secret check for Vercel Cron / manual ops triggers (N6).

/**
 * Verify the `Authorization: Bearer <CRON_SECRET>` header.
 * In development, missing `CRON_SECRET` is allowed so local curl works.
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
