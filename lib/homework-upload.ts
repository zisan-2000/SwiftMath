export const MAX_HOMEWORK_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_HOMEWORK_PHOTO_PIXELS = 40_000_000;
export const HOMEWORK_PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const;
export type HomeworkPhotoType = keyof typeof HOMEWORK_PHOTO_TYPES;

/** Inspect bytes, not the filename or browser MIME (Android gallery MIME varies). */
export function homeworkPhotoType(bytes: Uint8Array): HomeworkPhotoType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "image/png";
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  if (
    text(4, 8) === "ftyp" &&
    ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(text(8, 12))
  )
    return "image/heic";
  return null;
}

export class HomeworkUploadError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface HomeworkUploadTicket {
  id: string;
  pathname: string;
  kind: "FIRST" | "FINAL";
  byteSize: number;
  sha256: string;
  contentType: HomeworkPhotoType;
  expiresAt: string;
  completedSubmissionId: string | null;
  transport: "blob" | "local";
  pageNumber: string | null;
}
export function homeworkUploadMessage(status: number) {
  if (status === 401)
    return "Your session expired. Sign in again, then return here and retry. Your uploaded photo can still be recovered.";
  if (status === 403)
    return "You do not have permission to upload this homework. Refresh or contact your teacher.";
  if (status === 413)
    return "The photo could not be transferred. Refresh this page to use the latest uploader, then retry.";
  if (status === 429)
    return "Too many upload attempts. Please wait a little and retry.";
  return "We could not confirm the upload. Check your connection and retry; a saved submission will not be duplicated.";
}
