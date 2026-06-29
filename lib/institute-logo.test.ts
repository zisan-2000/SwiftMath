import { describe, expect, it } from "vitest";

import {
  ALLOWED_LOGO_MIME_TYPES,
  logoFileExtension,
  MAX_LOGO_FILE_BYTES,
  validateLogoUploadFile,
} from "@/lib/institute-logo";

describe("validateLogoUploadFile", () => {
  it("accepts a small PNG", () => {
    expect(
      validateLogoUploadFile({ size: 1024, type: "image/png" }),
    ).toBeNull();
  });

  it("rejects empty files", () => {
    expect(validateLogoUploadFile({ size: 0, type: "image/png" })).toBe(
      "Choose a logo file to upload.",
    );
  });

  it("rejects files over 1 MB", () => {
    expect(
      validateLogoUploadFile({
        size: MAX_LOGO_FILE_BYTES + 1,
        type: "image/png",
      }),
    ).toBe("Logo must be 1 MB or smaller.");
  });

  it("rejects unsupported MIME types", () => {
    expect(
      validateLogoUploadFile({ size: 100, type: "application/pdf" }),
    ).toBe("Logo must be PNG, JPEG, WebP, or GIF.");
  });
});

describe("logoFileExtension", () => {
  it("maps allowed MIME types", () => {
    for (const mime of ALLOWED_LOGO_MIME_TYPES) {
      expect(logoFileExtension(mime)).not.toBeNull();
    }
  });
});
