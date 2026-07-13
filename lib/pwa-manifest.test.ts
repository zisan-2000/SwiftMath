import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("meets installable baseline for student mobile", () => {
    const route = manifest();

    expect(route.name).toBeTruthy();
    expect(route.short_name).toBeTruthy();
    expect(route.display).toBe("standalone");
    expect(route.orientation).toBe("portrait");
    expect(route.start_url).toBe("/student");
    expect(route.scope).toBe("/");
    expect(route.icons?.length).toBeGreaterThanOrEqual(3);
    expect(route.icons?.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(route.icons?.some((icon) => icon.sizes === "512x512")).toBe(true);
    expect(route.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
