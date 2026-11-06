import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, link, unlink } from "node:fs/promises";
import path from "node:path";
import { head, get, del, BlobNotFoundError } from "@vercel/blob";
import type {
  HomeworkPhotoUpload,
  Prisma,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  HOMEWORK_PHOTO_TYPES,
  HomeworkUploadError,
  MAX_HOMEWORK_PHOTO_BYTES,
  type HomeworkPhotoType,
  type HomeworkUploadTicket,
} from "@/lib/homework-upload";
import {
  HomeworkError,
  prepareHomeworkStart,
  prepareHomeworkFinal,
} from "@/server/homework";
import { validateHomeworkImage } from "@/server/homework-image-validation";
import { homeworkTiming } from "@/lib/homework-schedule";
import {
  uploadDependencyCode,
  uploadDiagnostic,
} from "@/server/homework-upload-http";

type Student = { id: string; instituteId: string };
const TICKET_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keyFor = (ticket: HomeworkPhotoUpload) =>
  `${ticket.storage}:${ticket.pathname}`;
function dto(ticket: HomeworkPhotoUpload): HomeworkUploadTicket {
  return {
    id: ticket.id,
    pathname: ticket.pathname,
    kind: ticket.kind,
    byteSize: ticket.byteSize,
    sha256: ticket.sha256,
    contentType: ticket.contentType as HomeworkPhotoType,
    expiresAt: ticket.expiresAt.toISOString(),
    completedSubmissionId: ticket.completedSubmissionId,
    transport: ticket.storage as "blob" | "local",
    pageNumber: ticket.pageNumber,
  };
}
export async function ownedHomeworkUpload(
  student: Student,
  id: string,
  db: Prisma.TransactionClient = prisma,
) {
  if (!UUID.test(id))
    throw new HomeworkUploadError("NOT_FOUND", "Upload not found.", 404);
  const ticket = await db.homeworkPhotoUpload.findFirst({
    where: { id, studentId: student.id, instituteId: student.instituteId },
  });
  if (!ticket)
    throw new HomeworkUploadError("NOT_FOUND", "Upload not found.", 404);
  return ticket;
}
export function pendingHomeworkUpload(ticket: HomeworkPhotoUpload) {
  if (ticket.status !== "PENDING" || ticket.expiresAt.getTime() <= Date.now())
    throw new HomeworkUploadError(
      "UPLOAD_EXPIRED",
      "This upload has expired. Choose your photo again to start a new upload.",
      409,
    );
}
async function eligible(
  ticket: HomeworkPhotoUpload,
  student: Student,
  db: Prisma.TransactionClient = prisma,
) {
  if (ticket.kind === "FIRST") {
    const prepared = await prepareHomeworkStart(
      student,
      ticket.expectationId,
      ticket.pageNumber!,
      db,
    );
    if (prepared.attemptNumber !== ticket.expectedAttemptNumber)
      throw new HomeworkUploadError(
        "STALE_ATTEMPT",
        "This homework has changed. Refresh to see the current attempt.",
        409,
      );
    return prepared;
  }
  await prepareHomeworkFinal(student, ticket.submissionId!, db);
  return null;
}
export async function createHomeworkUpload(
  student: Student,
  input: Record<string, unknown>,
) {
  const { requestId, kind, byteSize, contentType, sha256 } = input;
  if (
    typeof requestId !== "string" ||
    !UUID.test(requestId) ||
    !["FIRST", "FINAL"].includes(String(kind)) ||
    !Number.isInteger(byteSize) ||
    Number(byteSize) <= 0 ||
    Number(byteSize) > MAX_HOMEWORK_PHOTO_BYTES ||
    typeof contentType !== "string" ||
    !Object.hasOwn(HOMEWORK_PHOTO_TYPES, contentType) ||
    typeof sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(sha256)
  )
    throw new HomeworkUploadError(
      "UPLOAD_DETAILS",
      "Choose a supported photo up to 8 MiB and retry.",
    );
  const storage = process.env.BLOB_READ_WRITE_TOKEN?.trim() ? "blob" : "local";
  if (storage === "local" && process.env.NODE_ENV === "production")
    throw new HomeworkUploadError(
      "STORAGE_CONFIG",
      "Photo storage is temporarily unavailable. Contact your teacher.",
      503,
    );
  const expectationId =
    typeof input.expectationId === "string" ? input.expectationId : "";
  const submissionId =
    typeof input.submissionId === "string" ? input.submissionId : "";
  const pageNumber =
    typeof input.pageNumber === "string" ? input.pageNumber.trim() : "";
  const ticket = await prisma.$transaction(async (tx) => {
    // Serialize ticket quotas / duplicate request IDs for one account.
    await tx.$queryRaw`SELECT id FROM "user" WHERE id=${student.id} FOR UPDATE`;
    const old = await tx.homeworkPhotoUpload.findUnique({
      where: { studentId_requestId: { studentId: student.id, requestId } },
    });
    if (old) {
      if (
        old.instituteId !== student.instituteId ||
        old.kind !== kind ||
        old.byteSize !== byteSize ||
        old.sha256 !== sha256 ||
        old.contentType !== contentType ||
        (kind === "FIRST"
          ? old.expectationId !== expectationId || old.pageNumber !== pageNumber
          : old.submissionId !== submissionId)
      )
        throw new HomeworkUploadError(
          "INTENT_CONFLICT",
          "The selected photo or page changed. Start a new upload.",
          409,
        );
      if (old.status !== "FINALIZED") pendingHomeworkUpload(old);
      return old;
    }
    const count = await tx.homeworkPhotoUpload.count({
      where: {
        studentId: student.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (count >= 20)
      throw new HomeworkUploadError(
        "UPLOAD_LIMIT",
        "Too many pending photos. Wait a little or finish an existing upload.",
        429,
      );
    let target = expectationId,
      attempt: number;
    if (kind === "FIRST")
      attempt = (await prepareHomeworkStart(student, target, pageNumber, tx))
        .attemptNumber;
    else {
      const final = await prepareHomeworkFinal(student, submissionId, tx);
      target = final.expectationId;
      attempt = final.attemptNumber;
    }
    const id = randomUUID();
    return tx.homeworkPhotoUpload.create({
      data: {
        id,
        requestId,
        instituteId: student.instituteId,
        studentId: student.id,
        expectationId: target,
        kind: kind as "FIRST" | "FINAL",
        submissionId: kind === "FINAL" ? submissionId : null,
        pageNumber: kind === "FIRST" ? pageNumber : null,
        expectedAttemptNumber: attempt,
        pathname: `homework-uploads/${student.instituteId}/${student.id}/${id}.${HOMEWORK_PHOTO_TYPES[contentType as HomeworkPhotoType]}`,
        storage,
        byteSize: Number(byteSize),
        contentType,
        sha256,
        expiresAt: new Date(Date.now() + TICKET_MS),
      },
    });
  });
  uploadDiagnostic("authorize", ticket.id, "ok", { bytes: ticket.byteSize });
  return dto(ticket);
}
export async function homeworkUploadAuthorization(
  student: Student,
  id: string,
  pathname: string,
) {
  const ticket = await ownedHomeworkUpload(student, id);
  pendingHomeworkUpload(ticket);
  if (ticket.storage !== "blob" || ticket.pathname !== pathname)
    throw new HomeworkUploadError(
      "PATH_SCOPE",
      "This upload is not authorized.",
      403,
    );
  await eligible(ticket, student);
  return {
    allowedContentTypes: [ticket.contentType],
    maximumSizeInBytes: ticket.byteSize,
    validUntil: Math.min(
      ticket.expiresAt.getTime(),
      Date.now() + 10 * 60 * 1000,
    ),
    addRandomSuffix: false,
    allowOverwrite: false,
    tokenPayload: JSON.stringify({ uploadId: ticket.id }),
  };
}
export async function homeworkUploadStatus(student: Student, id: string) {
  return dto(await ownedHomeworkUpload(student, id));
}

export async function boundedPhotoBody(
  stream: ReadableStream<Uint8Array>,
  limit = MAX_HOMEWORK_PHOTO_BYTES,
) {
  const reader = stream.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HomeworkUploadError(
          "IMAGE_SIZE",
          "The uploaded photo exceeds its allowed size.",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
async function verifiedPhoto(ticket: HomeworkPhotoUpload) {
  let buffer: Buffer;
  try {
    if (ticket.storage === "local")
      buffer = await readFile(
        path.join(process.cwd(), ".data", ...ticket.pathname.split("/")),
      );
    else {
      const metadata = await head(ticket.pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (
        metadata.pathname !== ticket.pathname ||
        metadata.size !== ticket.byteSize ||
        metadata.contentType.split(";")[0] !== ticket.contentType
      )
        throw new HomeworkUploadError(
          "PHOTO_MISMATCH",
          "The stored photo does not match this upload. Choose the photo again.",
        );
      const object = await get(ticket.pathname, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        useCache: false,
      });
      if (!object || object.statusCode !== 200)
        throw new HomeworkUploadError(
          "PHOTO_NOT_READY",
          "The photo transfer has not finished. Retry to recover it.",
          409,
        );
      buffer = await boundedPhotoBody(object.stream, ticket.byteSize);
    }
  } catch (error) {
    if (
      error instanceof BlobNotFoundError ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT")
    )
      throw new HomeworkUploadError(
        "PHOTO_NOT_READY",
        "The photo has not reached storage yet. Choose it again and retry.",
        409,
      );
    uploadDiagnostic("storage-read", ticket.id, "error", {
      code: error instanceof HomeworkUploadError ? error.code : "STORAGE_READ",
    });
    throw error;
  }
  if (
    buffer.length !== ticket.byteSize ||
    createHash("sha256").update(buffer).digest("hex") !== ticket.sha256
  )
    throw new HomeworkUploadError(
      "PHOTO_MISMATCH",
      "The uploaded photo is incomplete or changed. Choose it again.",
    );
  const type = await validateHomeworkImage(buffer);
  if (type !== ticket.contentType)
    throw new HomeworkUploadError(
      "PHOTO_TYPE",
      "The photo format does not match its contents.",
    );
  uploadDiagnostic("storage-verified", ticket.id, "ok", {
    bytes: buffer.length,
  });
  return keyFor(ticket);
}
export async function storeLocalHomeworkUpload(
  student: Student,
  id: string,
  request: Request,
) {
  if (process.env.NODE_ENV === "production")
    throw new HomeworkUploadError("NOT_FOUND", "Not found.", 404);
  const ticket = await ownedHomeworkUpload(student, id);
  pendingHomeworkUpload(ticket);
  if (ticket.storage !== "local" || !request.body)
    throw new HomeworkUploadError(
      "LOCAL_UPLOAD",
      "This upload requires private Blob storage.",
      400,
    );
  await eligible(ticket, student);
  const bytes = await boundedPhotoBody(request.body, ticket.byteSize);
  if (
    bytes.length !== ticket.byteSize ||
    createHash("sha256").update(bytes).digest("hex") !== ticket.sha256
  )
    throw new HomeworkUploadError(
      "PHOTO_MISMATCH",
      "The selected photo changed. Choose it again.",
    );
  const target = path.join(
    process.cwd(),
    ".data",
    ...ticket.pathname.split("/"),
  );
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { flag: "wx" });
  try {
    await link(temporary, target);
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      )
    )
      throw error;
  } finally {
    await unlink(temporary);
  }
  uploadDiagnostic("local-transfer", ticket.id, "ok", { bytes: bytes.length });
}
export async function finalizeHomeworkUpload(student: Student, id: string) {
  const ticket = await ownedHomeworkUpload(student, id);
  if (ticket.status === "FINALIZED")
    return {
      submissionId: ticket.completedSubmissionId!,
      kind: ticket.kind,
      recovered: true,
    };
  pendingHomeworkUpload(ticket);
  const key = await verifiedPhoto(ticket),
    started = Date.now();
  const result = await prisma
    .$transaction(
      async (tx) => {
        // The CAS and submission mutation are in ONE transaction. A losing retry sees the winner.
        const claim = await tx.homeworkPhotoUpload.updateMany({
          where: {
            id: ticket.id,
            status: "PENDING",
            expiresAt: { gt: new Date() },
          },
          data: { status: "FINALIZING" },
        });
        if (!claim.count) {
          const current = await tx.homeworkPhotoUpload.findUniqueOrThrow({
            where: { id: ticket.id },
          });
          if (current.status === "FINALIZED")
            return {
              submissionId: current.completedSubmissionId!,
              kind: current.kind,
              recovered: true,
            };
          throw new HomeworkUploadError(
            "UPLOAD_EXPIRED",
            "This upload expired. Choose the photo again.",
            409,
          );
        }
        await tx.$queryRaw`SELECT id FROM homework_expectation WHERE id=${ticket.expectationId} FOR UPDATE`;
        let submissionId: string;
        if (ticket.kind === "FIRST") {
          await eligible(ticket, student, tx);
          const saved = await tx.homeworkSubmission.create({
            data: {
              expectationId: ticket.expectationId,
              attemptNumber: ticket.expectedAttemptNumber,
              pageNumber: ticket.pageNumber!,
              firstPhotoKey: key,
            },
          });
          submissionId = saved.id;
        } else {
          const saved = await prepareHomeworkFinal(
            student,
            ticket.submissionId!,
            tx,
          );
          const submittedAt = new Date();
          const changed = await tx.homeworkSubmission.updateMany({
            where: { id: saved.id, status: "IN_PROGRESS" },
            data: {
              finalPhotoKey: key,
              submittedAt,
              status: "SUBMITTED",
              ...homeworkTiming(
                saved.startedAt,
                submittedAt,
                saved.expectation.occurrence.dueAt,
                saved.expectation.occurrence.timeLimitMinutesSnapshot,
              ),
            },
          });
          if (changed.count !== 1)
            throw new HomeworkError(
              "This homework has already been submitted. Refresh to see the result.",
            );
          submissionId = saved.id;
        }
        await tx.homeworkPhotoUpload.update({
          where: { id: ticket.id },
          data: {
            status: "FINALIZED",
            completedSubmissionId: submissionId,
            finalizedAt: new Date(),
          },
        });
        return { submissionId, kind: ticket.kind, recovered: false };
      },
      { timeout: 10_000 },
    )
    .catch((error) => {
      uploadDiagnostic("db-finalize", ticket.id, "error", {
        code: uploadDependencyCode(error, "DB_FINALIZE"),
      });
      throw error;
    });
  uploadDiagnostic("db-commit", ticket.id, "ok", {
    durationMs: Date.now() - started,
  });
  return result;
}

/** Only new upload-intent objects, never legacy homework/ keys or finalized photos. */
export async function cleanupExpiredHomeworkUploads(limit = 25) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const candidates = await prisma.homeworkPhotoUpload.findMany({
    where: {
      status: { in: ["PENDING", "EXPIRED"] },
      expiresAt: { lt: cutoff },
      cleanedAt: null,
    },
    take: limit,
    orderBy: { expiresAt: "asc" },
  });
  let cleaned = 0;
  for (const ticket of candidates) {
    try {
      const claimed = await prisma.homeworkPhotoUpload.updateMany({
        where: {
          id: ticket.id,
          status: { in: ["PENDING", "EXPIRED"] },
          completedSubmissionId: null,
        },
        data: { status: "EXPIRED" },
      });
      if (
        !claimed.count ||
        !ticket.pathname.startsWith(
          `homework-uploads/${ticket.instituteId}/${ticket.studentId}/${ticket.id}.`,
        )
      )
        continue;
      const key = keyFor(ticket);
      if (
        await prisma.homeworkSubmission.count({
          where: { OR: [{ firstPhotoKey: key }, { finalPhotoKey: key }] },
        })
      )
        continue;
      if (ticket.storage === "blob")
        await del(ticket.pathname, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      else {
        try {
          await unlink(
            path.join(process.cwd(), ".data", ...ticket.pathname.split("/")),
          );
        } catch (error) {
          if (
            !(
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "ENOENT"
            )
          )
            throw error;
        }
      }
      await prisma.homeworkPhotoUpload.update({
        where: { id: ticket.id },
        data: { cleanedAt: new Date() },
      });
      cleaned++;
    } catch {
      uploadDiagnostic("cleanup", ticket.id, "error", {
        code: "CLEANUP_RETRY",
      });
    }
  }
  return { examined: candidates.length, cleaned };
}
