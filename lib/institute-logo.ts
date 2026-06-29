// Logo file upload validation (institute admin settings).

/** Maximum logo upload size (1 MB). */
export const MAX_LOGO_FILE_BYTES = 1024 * 1024;

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type AllowedLogoMimeType = (typeof ALLOWED_LOGO_MIME_TYPES)[number];

/** Validate an uploaded logo before storage. */
export function validateLogoUploadFile(file: {
  size: number;
  type: string;
}): string | null {
  if (file.size <= 0) return "Choose a logo file to upload.";
  if (file.size > MAX_LOGO_FILE_BYTES) {
    return "Logo must be 1 MB or smaller.";
  }
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as AllowedLogoMimeType)) {
    return "Logo must be PNG, JPEG, WebP, or GIF.";
  }
  return null;
}

/** File extension for a validated logo MIME type. */
export function logoFileExtension(mimeType: string): string | null {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}
