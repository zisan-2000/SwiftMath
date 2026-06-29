import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  ],
};

export default nextConfig;
