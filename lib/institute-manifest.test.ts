import { describe, expect, it } from "vitest";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/institute-theme";
import { Role } from "@/lib/generated/prisma/enums";
import {
  PLATFORM_MANIFEST_ICONS,
  buildWebAppManifest,
  iconMimeFromUrl,
  shortManifestName,
} from "@/lib/institute-manifest";

describe("shortManifestName", () => {
  it("keeps short names and truncates long ones", () => {
    expect(shortManifestName("SEFT")).toBe("SEFT");
    expect(shortManifestName("Bright Minds Academy")).toBe("Bright");
    expect(shortManifestName("Supercalifragilistic")).toBe("Supercalifra");
  });
});

describe("iconMimeFromUrl", () => {
  it("guesses MIME from file extension", () => {
    expect(iconMimeFromUrl("https://cdn.example.com/a.jpg")).toBe("image/jpeg");
    expect(iconMimeFromUrl("https://cdn.example.com/a.webp?x=1")).toBe("image/webp");
    expect(iconMimeFromUrl("https://cdn.example.com/a.png")).toBe("image/png");
  });
});

describe("buildWebAppManifest", () => {
  it("returns platform defaults without institute branding", () => {
    const route = buildWebAppManifest({ institute: null });

    expect(route.name).toBe(APP_NAME);
    expect(route.short_name).toBe("SEFT");
    expect(route.description).toBe(APP_TAGLINE);
    expect(route.display).toBe("standalone");
    expect(route.orientation).toBe("portrait");
    expect(route.start_url).toBe("/login");
    expect(route.scope).toBe("/");
    expect(route.theme_color).toBe(DEFAULT_PRIMARY_COLOR);
    expect(route.icons).toEqual(PLATFORM_MANIFEST_ICONS);
  });

  it("applies institute name, tagline, color, logo, and role start_url", () => {
    const route = buildWebAppManifest({
      institute: {
        id: "inst_1",
        name: "Bright Minds Abacus",
        tagline: "Practice with us",
        logoUrl: "https://cdn.example.com/logo.png",
        primaryColor: "#e11d48",
      },
      role: Role.STUDENT,
    });

    expect(route.name).toBe("Bright Minds Abacus");
    expect(route.short_name).toBe("Bright");
    expect(route.description).toBe("Practice with us");
    expect(route.theme_color).toBe("#E11D48");
    expect(route.start_url).toBe("/student");
    expect(route.icons?.[0]?.src).toBe("/api/pwa/institute-icon/inst_1/192");
    expect(route.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("uses role home for teacher and falls back safely without logo", () => {
    const route = buildWebAppManifest({
      institute: {
        id: "inst_2",
        name: "SEFT Institute",
        tagline: null,
        logoUrl: null,
        primaryColor: null,
      },
      role: Role.TEACHER,
    });

    expect(route.start_url).toBe("/teacher");
    expect(route.description).toBe(APP_TAGLINE);
    expect(route.theme_color).toBe(DEFAULT_PRIMARY_COLOR);
    expect(route.icons).toEqual(PLATFORM_MANIFEST_ICONS);
  });
});
