import {
  homeworkUploadStudent,
  requireUploadOrigin,
  smallUploadJson,
  uploadDiagnostic,
  uploadFailure,
  uploadJson,
} from "@/server/homework-upload-http";
import { ownedHomeworkUpload } from "@/server/homework-uploads";
export async function POST(request: Request) {
  try {
    requireUploadOrigin(request);
    const student = await homeworkUploadStudent();
    const body = await smallUploadJson(request);
    if (typeof body.uploadId !== "string") return uploadJson({ ok: true });
    const ticket = await ownedHomeworkUpload(student, body.uploadId);
    uploadDiagnostic("client-transfer", ticket.id, "error", {
      code: "CLIENT_TRANSFER",
      ...(Number.isInteger(body.status) &&
      Number(body.status) >= 400 &&
      Number(body.status) < 600
        ? { status: Number(body.status) }
        : {}),
    });
    return uploadJson({ ok: true });
  } catch (error) {
    return uploadFailure(error, "client-diagnostic", "client-diagnostic");
  }
}
