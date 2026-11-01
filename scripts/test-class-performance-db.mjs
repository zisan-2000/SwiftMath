// Always creates a NEW local database. Never migrates, seeds or cleans the source DB.
import "dotenv/config";
import { Client } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const sourceUrl = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(sourceUrl.hostname)) {
  throw new Error(
    "Run PostgreSQL regression tests against a local PostgreSQL server.",
  );
}
async function fingerprint() {
  const client = new Client({ connectionString: sourceUrl.toString() });
  await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result = await client.query(`
      SELECT 'sheets' kind, count(*)::text count,
        md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY t.id), '')) fingerprint FROM class_performance t
      UNION ALL SELECT 'entries', count(*)::text,
        md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY t.id), '')) FROM class_performance_entry t`);
    await client.query("COMMIT");
    return result.rows;
  } finally {
    await client.end();
  }
}
const before = await fingerprint();
const name = `swiftmath_cp_regression_${Date.now()}`;
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = "/postgres";
const admin = new Client({ connectionString: adminUrl.toString() });
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${name}"`);
} finally {
  await admin.end();
}
const isolatedUrl = new URL(sourceUrl);
isolatedUrl.pathname = `/${name}`;
const isolated = new Client({ connectionString: isolatedUrl.toString() });
await isolated.connect();
try {
  for (const dir of readdirSync("prisma/migrations").sort()) {
    if (dir === "migration_lock.toml") continue;
    // A genuine pre-migration fixture verifies the additive migration, not just new writes.
    if (dir === "20261101120000_protect_class_performance_history") {
      await isolated.query(`
        INSERT INTO institute(id,slug,name,"updatedAt") VALUES ('migration-institute','migration-institute','Legacy',now());
        INSERT INTO "user"(id,name,email,role,"instituteId","updatedAt") VALUES
          ('migration-teacher','Legacy teacher','legacy-teacher@invalid.test','TEACHER','migration-institute',now()),
          ('migration-student','Legacy student','legacy-student@invalid.test','STUDENT','migration-institute',now());
        INSERT INTO "group"(id,name,"instituteId","teacherId","updatedAt") VALUES ('migration-group','Legacy','migration-institute','migration-teacher',now());
        INSERT INTO class_performance(id,"instituteId","groupId","classDate","maximumMark","createdById","updatedAt")
          VALUES ('migration-sheet','migration-institute','migration-group','2026-10-24',10,'migration-teacher',now());
        INSERT INTO class_performance_entry(id,"instituteId","classPerformanceId","studentId",mark,status,"updatedAt")
          VALUES ('migration-entry','migration-institute','migration-sheet','migration-student',8.5,'PRESENT',now());`);
    }
    await isolated.query(
      readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"),
    );
  }
} finally {
  await isolated.end();
}
console.log(`Isolated PostgreSQL database: ${name} (retained for inspection)`);
const test = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "server/class-performance.integration.test.ts",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CLASS_PERFORMANCE_TEST_DATABASE_URL: isolatedUrl.toString(),
    },
  },
);
const after = await fingerprint();
console.log(
  "Source database read-only integrity:",
  JSON.stringify({
    before,
    after,
    unchanged: JSON.stringify(before) === JSON.stringify(after),
  }),
);
process.exitCode =
  test.status || (JSON.stringify(before) === JSON.stringify(after) ? 0 : 1);
