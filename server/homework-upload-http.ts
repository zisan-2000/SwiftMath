import "server-only";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { HomeworkError } from "@/server/homework";
import { HomeworkUploadError } from "@/lib/homework-upload";

export function uploadDiagnostic(
  stage: string,
  correlation: string,
  outcome: string,
  detail: {
    status?: number;
    bytes?: number;
    code?: string;
    durationMs?: number;
  } = {},
) {
  const record = {
    event: "homework-upload",
    stage,
    correlation: createHash("sha256")
      .update(correlation)
      .digest("hex")
      .slice(0, 16),
    outcome,
    ...detail,
  };
  if (outcome === "error") console.error(JSON.stringify(record));
  else console.info(JSON.stringify(record));
}

/** Classify dependency failures without logging their potentially sensitive messages. */
export function uploadDependencyCode(error: unknown, fallback: string) {
  if (error instanceof HomeworkUploadError) return error.code;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  )
    return `PRISMA_${error.code}`;
  return fallback;
}
export function requireUploadOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next's internal Request URL can use a backend host behind a reverse proxy.
  // Reuse the configured auth origin; do not trust arbitrary forwarded headers.
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  if (!origin || origin !== expected)
    throw new HomeworkUploadError(
      "ORIGIN",
      "Refresh this page and try again.",
      403,
    );
}
export async function homeworkUploadStudent() {
  const user = await getCurrentUser();
  if (!user)
    throw new HomeworkUploadError(
      "SESSION_EXPIRED",
      "Sign in again, then return to this homework and retry.",
      401,
    );
  if (
    user.role !== "STUDENT" ||
    !(await can(user, PERMISSIONS.STUDENT_HOMEWORK_SUBMIT))
  )
    throw new HomeworkUploadError(
      "PERMISSION",
      "You cannot upload this homework.",
      403,
    );
  const active = await prisma.user.findFirst({
    where: {
      id: user.id,
      instituteId: user.instituteId,
      isActive: true,
      institute: { isActive: true },
    },
    select: { id: true },
  });
  if (!active)
    throw new HomeworkUploadError(
      "PERMISSION",
      "Your account is unavailable. Contact your teacher.",
      403,
    );
  return { id: user.id, instituteId: user.instituteId };
}
export async function smallUploadJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HomeworkUploadError(
      "REQUEST",
      "Use the current homework uploader.",
      415,
    );
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (!reader)
    throw new HomeworkUploadError("REQUEST", "Missing upload details.");
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 16_384) {
        await reader.cancel();
        throw new HomeworkUploadError(
          "REQUEST_SIZE",
          "Send upload details only; photos go directly to storage.",
          413,
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
    return body as Record<string, unknown>;
  } catch {
    throw new HomeworkUploadError(
      "REQUEST",
      "Invalid upload details. Refresh and retry.",
    );
  }
}
export function uploadFailure(
  error: unknown,
  stage: string,
  correlation: string,
) {
  const known =
    error instanceof HomeworkUploadError
      ? error
      : error instanceof HomeworkError
        ? new HomeworkUploadError("HOMEWORK_STATE", error.message, 409)
        : null;
  const status = known?.status ?? 503;
  uploadDiagnostic(stage, correlation, "error", {
    status,
    code: known?.code ?? "DEPENDENCY_FAILURE",
  });
  return Response.json(
    {
      error:
        known?.message ??
        "The upload could not be confirmed. Check your connection and retry; saved work will not be duplicated.",
      code: known?.code ?? "RETRYABLE",
      reference: createHash("sha256")
        .update(correlation)
        .digest("hex")
        .slice(0, 16),
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export function uploadJson(data: unknown) {
  return Response.json(data, {
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
