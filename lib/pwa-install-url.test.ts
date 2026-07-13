import { describe, expect, it } from "vitest";

import { APP_NAME } from "@/lib/constants";
import {
  buildStudentInstallHelpUrl,
  buildStudentInstallPromptUrl,
  buildWhatsAppShareText,
  buildWhatsAppShareUrl,
} from "@/lib/pwa-install-url";

describe("pwa install url helpers", () => {
  it("builds help and prompt urls without trailing slash", () => {
    expect(buildStudentInstallHelpUrl("https://app.example.com/")).toBe(
      "https://app.example.com/student/help/install",
    );
    expect(buildStudentInstallPromptUrl("https://app.example.com")).toBe(
      "https://app.example.com/student/help/install?install=1",
    );
  });

  it("builds whatsapp share content", () => {
    const url = "https://app.example.com/student/help/install";
    const text = buildWhatsAppShareText(url, APP_NAME);
    expect(text).toContain(url);
    expect(text).toContain("Add to Home Screen");

    const waUrl = buildWhatsAppShareUrl(url, APP_NAME);
    expect(waUrl.startsWith("https://wa.me/?text=")).toBe(true);
  });
});
