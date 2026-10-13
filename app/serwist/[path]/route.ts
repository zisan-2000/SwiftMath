import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createSerwistRoute } from "@serwist/turbopack";

import { PLATFORM_ICON_URLS } from "@/lib/constants";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    additionalPrecacheEntries: [
      { url: "/~offline", revision },
      { url: PLATFORM_ICON_URLS.icon192, revision: null },
      { url: PLATFORM_ICON_URLS.icon512, revision: null },
      { url: PLATFORM_ICON_URLS.maskable512, revision: null },
      { url: PLATFORM_ICON_URLS.appleTouch, revision: null },
      { url: PLATFORM_ICON_URLS.badge96, revision: null },
    ],
    useNativeEsbuild: true,
  });
