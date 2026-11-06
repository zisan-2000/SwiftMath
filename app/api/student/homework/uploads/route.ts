import { randomUUID } from "node:crypto";
import { createHomeworkUpload } from "@/server/homework-uploads";
import {
  homeworkUploadStudent,
  requireUploadOrigin,
  smallUploadJson,
  uploadFailure,
  uploadJson,
} from "@/server/homework-upload-http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let correlation = randomUUID() as string;
  try {
    requireUploadOrigin(request);
    const student = await homeworkUploadStudent();
    const input = await smallUploadJson(request);
    if (
      typeof input.requestId === "string" &&
      /^[a-f0-9-]{36}$/i.test(input.requestId)
    )
      correlation = input.requestId;
    return uploadJson(await createHomeworkUpload(student, input));
  } catch (error) {
    return uploadFailure(error, "authorize", correlation);
  }
}
