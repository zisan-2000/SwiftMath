import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "development",
  },
  // Allow institute logo uploads in server actions (max 1 MB + form overhead).
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Keep server-only packages out of the bundler and require them at runtime in
  // Node instead. better-auth statically pulls in its kysely adapter (which we
  // don't use — we're on Prisma), and bundling it trips over a kysely export
  // mismatch. Prisma + the pg driver are likewise happier left external.
  serverExternalPackages: [
    "better-auth",
    "@better-auth/kysely-adapter",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "sharp",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/serwist/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        // Session-scoped dynamic manifest — never CDN-cache across users.
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
