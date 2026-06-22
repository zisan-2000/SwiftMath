import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests run in Node and resolve the `@/*` alias to the project root,
// matching tsconfig. We only test pure, framework-agnostic modules (no Prisma
// or `server-only`), so no DOM or database is needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
