import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { homeworkUploadAuthorization } from "@/server/homework-uploads";
import {
  homeworkUploadStudent,
  requireUploadOrigin,
  smallUploadJson,
  uploadDiagnostic,
  uploadFailure,
  uploadJson,
} from "@/server/homework-upload-http";
import { HomeworkUploadError } from "@/lib/homework-upload";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let correlation = "blob-callback";
  let completion = false;
  try {
    const body = await smallUploadJson(request);
    completion = body.type === "blob.upload-completed";
    if (!completion && body.type !== "blob.generate-client-token")
      throw new HomeworkUploadError("REQUEST", "Invalid upload event.");
    if (!completion) requireUploadOrigin(request);
    const response = await handleUpload({
      request,
      body: body as unknown as HandleUploadBody,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, payload) => {
        let id: unknown;
        try {
          id = JSON.parse(payload ?? "{}").uploadId;
        } catch {
          throw new HomeworkUploadError(
            "UPLOAD_DETAILS",
            "Invalid upload authorization.",
          );
        }
        if (typeof id !== "string")
          throw new HomeworkUploadError(
            "UPLOAD_DETAILS",
            "Missing upload authorization.",
          );
        correlation = id;
        const scope = await homeworkUploadAuthorization(
          await homeworkUploadStudent(),
          id,
          pathname,
        );
        uploadDiagnostic("token-issued", id, "ok");
        return scope;
      },
      // SDK verifies the callback signature BEFORE invoking this callback.
      // Database finalization still requires the student's authenticated metadata request.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let id: unknown;
        try {
          id = JSON.parse(tokenPayload ?? "{}").uploadId;
        } catch {
          return;
        }
        if (typeof id !== "string") return;
        const ticket = await prisma.homeworkPhotoUpload.findFirst({
          where: { id, pathname: blob.pathname, storage: "blob" },
        });
        if (!ticket) return;
        uploadDiagnostic("storage-callback", ticket.id, "ok");
        if (ticket.status === "EXPIRED")
          await prisma.homeworkPhotoUpload.update({
            where: { id: ticket.id },
            data: { cleanedAt: null },
          });
      },
    });
    return uploadJson(response);
  } catch (error) {
    return uploadFailure(
      completion
        ? new HomeworkUploadError(
            "CALLBACK_REJECTED",
            "Upload callback rejected.",
            403,
          )
        : error,
      "token",
      correlation,
    );
  }
}
