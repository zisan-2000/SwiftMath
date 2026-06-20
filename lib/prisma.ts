// Prisma client singleton.
//
// Prisma 7 connects through a "driver adapter" rather than a bundled query
// engine. For self-hosted PostgreSQL we use `@prisma/adapter-pg`, pointed at
// the same DATABASE_URL the CLI uses.
//
// Next.js dev mode hot-reloads modules on every change, which would otherwise
// spawn a new PrismaClient (and a new connection pool) on each reload and
// exhaust the database connections. We cache a single instance on `globalThis`
// in development; in production a fresh module is created once per process.
//
// Import the client from anywhere on the server with:
//   import { prisma } from "@/lib/prisma";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    // Quieter logs in production; surface queries/warnings while developing.
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
