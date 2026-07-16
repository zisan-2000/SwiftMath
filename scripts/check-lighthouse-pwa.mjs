/**
 * @deprecated Lighthouse 12+ removed the "pwa" category. Use check-pwa-installable.mjs.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [path.join(scriptDir, "check-pwa-installable.mjs")],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
