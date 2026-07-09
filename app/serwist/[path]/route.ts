import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    additionalPrecacheEntries: [
      { url: "/~offline", revision },
      { url: "/icons/icon-192.png", revision: null },
      { url: "/icons/icon-512.png", revision: null },
      { url: "/icons/icon-maskable-512.png", revision: null },
      { url: "/icons/apple-touch-icon.png", revision: null },
      { url: "/icons/badge-96.png", revision: null },
    ],
    useNativeEsbuild: true,
  });
