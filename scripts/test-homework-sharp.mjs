// No .env is read. Creates a NEW local DB; no source or production records are used.
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { hashPassword } from "better-auth/crypto";
import { privateBlobMock } from "./fixtures/sharp-private-blob-mock.mjs";

if (
  (process.platform !== "linux" || process.arch !== "x64") &&
  !process.argv.includes("--allow-windows")
)
  throw Error(
    "Linux x64 required. --allow-windows is for an explicitly labelled local comparison only.",
  );
const root = process.cwd(),
  require = createRequire(path.join(root, "package.json"));
const adminUrl = new URL(process.env.SHARP_TEST_ADMIN_URL ?? "");
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(adminUrl.hostname) ||
  adminUrl.pathname !== "/postgres"
)
  throw Error("Explicit loopback PostgreSQL /postgres admin URL required.");
const name = `swiftmath_sharp_test_${Date.now()}`,
  url = new URL(adminUrl);
url.pathname = "/" + name;
const artifacts = path.join(root, ".data", name);
await mkdir(artifacts, { recursive: true });
const admin = new Client({ connectionString: adminUrl.toString() });
await admin.connect();
try {
  await admin.query(`CREATE DATABASE "${name}"`);
} finally {
  await admin.end();
}
const db = new Client({ connectionString: url.toString() });
await db.connect();
const checks = [];
let child = null,
  storage;
const check = (test, ok) => {
  checks.push({ test, pass: !!ok });
  if (!ok) throw Error(test);
};
const ids = Object.fromEntries(
  ["institute", "teacher", "student", "group", "level", "schedule"].map(
    (key) => [key, randomUUID()],
  ),
);
const password = "Synthetic-Sharp-Local-Only-2026!",
  port = Number(process.env.SHARP_TEST_APP_PORT ?? 3467),
  base = `http://127.0.0.1:${port}`;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
let studentCookie, teacherCookie;
async function stop() {
  if (child) {
    if (child.exitCode === null) {
      const stopped = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      const timeout = setTimeout(() => child?.kill("SIGKILL"), 15_000);
      try {
        await stopped;
      } finally {
        clearTimeout(timeout);
      }
    }
    child = null;
  }
}
async function start(failNative = false) {
  const env = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    HOME: process.env.HOME,
    NODE_ENV: "production",
    DATABASE_URL: url.toString(),
    BETTER_AUTH_SECRET: "sharp-smoke-synthetic-session-secret-2026",
    BETTER_AUTH_URL: base,
    NEXT_PUBLIC_APP_URL: base,
    BLOB_READ_WRITE_TOKEN: storage.token,
    VERCEL_BLOB_API_URL: storage.url,
    SHARP_TEST_PHOTO_DIR: storage.directory,
    SHARP_TEST_FAIL_NATIVE: failNative ? "1" : "0",
    NODE_OPTIONS: `--require ${JSON.stringify(path.join(root, "scripts/fixtures/sharp-test-preload.cjs"))}`,
    RESEND_API_KEY: "",
    CRON_SECRET: "synthetic-unused",
  };
  child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  const log = createWriteStream(
    path.join(
      artifacts,
      failNative ? "runtime-broken.log" : "runtime-healthy.log",
    ),
    { flags: "a" },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null)
      throw Error("Isolated Next process exited; inspect test log.");
    try {
      const res = await fetch(base + "/login");
      await res.arrayBuffer();
      if (res.status === 200) return;
    } catch {}
    await delay(500);
  }
  throw Error("Isolated Next did not become ready.");
}
async function signIn(role) {
  const response = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ email: `sharp-${role}@invalid.test`, password }),
  });
  await response.arrayBuffer();
  check(`sign in synthetic ${role}`, response.status === 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function api(route, body) {
  const response = await fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      Cookie: studentCookie,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: await response.json() };
}
async function page(route, cookie, label, expectedText) {
  const response = await fetch(base + route, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const html = await response.text();
  const expected =
    expectedText ??
    (route.startsWith("/student")
      ? "Your date-wise homework, uploads, results, and history."
      : "Choose a group to create schedules and review submissions.");
  check(
    label,
    response.status === 200 &&
      html.includes(expected) &&
      !html.includes("Failed to load external module"),
  );
}
let occurrenceNumber = 0;
async function expectation() {
  const occurrence = randomUUID(),
    id = randomUUID();
  await db.query(
    `INSERT INTO homework_occurrence(id,"instituteId","scheduleId","opensAt","dueAt","maxScoreSnapshot","timeLimitMinutesSnapshot","showTimerSnapshot","allowSamePageAgainSnapshot","expectationsMaterializedAt","updatedAt") VALUES($1,$2,$3,$4,$5,10,30,true,true,now(),now())`,
    [
      occurrence,
      ids.institute,
      ids.schedule,
      new Date(Date.now() - 86400000 - occurrenceNumber++ * 1000).toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
    ],
  );
  await db.query(
    `INSERT INTO homework_expectation(id,"instituteId","occurrenceId","studentId","academicLevelIdSnapshot","academicLevelNameSnapshot") VALUES($1,$2,$3,$4,$5,'Synthetic frozen level')`,
    [id, ids.institute, occurrence, ids.student, ids.level],
  );
  return id;
}
async function transfer(bytes, type, kind = "FIRST", submissionId) {
  const expected = kind === "FIRST" ? await expectation() : undefined;
  const { response, data } = await api("/api/student/homework/uploads", {
    requestId: randomUUID(),
    kind,
    expectationId: expected,
    submissionId,
    pageNumber: "49",
    contentType: type,
    byteSize: bytes.length,
    sha256: hash(bytes),
  });
  check(`authorize ${kind} ${type} ${bytes.length}`, response.status === 200);
  const { upload } = require("@vercel/blob/client");
  await upload(data.pathname, new Blob([bytes], { type }), {
    access: "private",
    handleUploadUrl: base + "/api/student/homework/blob",
    clientPayload: JSON.stringify({ uploadId: data.id }),
    contentType: type,
    headers: { Cookie: studentCookie, Origin: base },
  });
  return data;
}
async function finalize(ticket) {
  return api(`/api/student/homework/uploads/${ticket.id}`, {});
}
try {
  for (const directory of (await readdir("prisma/migrations")).sort())
    if (directory !== "migration_lock.toml")
      await db.query(
        await readFile(`prisma/migrations/${directory}/migration.sql`, "utf8"),
      );
  await db.query(
    `INSERT INTO institute(id,slug,name,"updatedAt") VALUES($1,$1,'Synthetic Sharp test',now())`,
    [ids.institute],
  );
  for (const role of ["teacher", "student"]) {
    await db.query(
      `INSERT INTO "user"(id,name,email,role,"instituteId","emailVerified","updatedAt") VALUES($1,$2,$3,$4,$5,true,now())`,
      [
        ids[role],
        `Synthetic ${role}`,
        `sharp-${role}@invalid.test`,
        role.toUpperCase(),
        ids.institute,
      ],
    );
    await db.query(
      `INSERT INTO account(id,"accountId","providerId",password,"userId","updatedAt") VALUES($1,$2,'credential',$3,$2,now())`,
      [randomUUID(), ids[role], await hashPassword(password)],
    );
  }
  await db.query(
    `INSERT INTO "group"(id,name,"instituteId","teacherId","updatedAt") VALUES($1,'Synthetic Group',$2,$3,now())`,
    [ids.group, ids.institute, ids.teacher],
  );
  await db.query(`INSERT INTO teacher_group_assignment("groupId","teacherId","instituteId") VALUES($1,$2,$3)`, [ids.group, ids.teacher, ids.institute]);
  await db.query(
    `INSERT INTO academic_level(id,"instituteId",name,"orderIndex","updatedAt") VALUES($1,$2,'Synthetic level',1,now())`,
    [ids.level, ids.institute],
  );
  await db.query(
    `UPDATE "user" SET "groupId"=$1,"academicLevelId"=$2 WHERE id=$3`,
    [ids.group, ids.level, ids.student],
  );
  await db.query(
    `INSERT INTO homework_schedule(id,"instituteId","createdById",mode,"targetType","groupId","originGroupId",title,"startDate","manualOpensAt","manualDueAt","maxScore","timeLimitMinutes","updatedAt") VALUES($1,$2,$3,'MANUAL_SPECIFIC','GROUP',$4,$4,'Synthetic Homework',$5,$5,$6,10,30,now())`,
    [
      ids.schedule,
      ids.institute,
      ids.teacher,
      ids.group,
      new Date(Date.now() - 86400000).toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
    ],
  );
  storage = await privateBlobMock(path.join(artifacts, "photos"));
  process.env.VERCEL_BLOB_API_URL = storage.url;
  // Node-side SDK must also be unable to reach external storage.
  const { MockAgent, setGlobalDispatcher } = require("undici");
  const network = new MockAgent();
  network.disableNetConnect();
  network.enableNetConnect(/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/);
  setGlobalDispatcher(network);
  await start();
  studentCookie = await signIn("student");
  teacherCookie = await signIn("teacher");
  await page(
    "/student/homework",
    studentCookie,
    "student homework loads with native engine installed",
  );
  await page(
    "/teacher/homework",
    teacherCookie,
    "teacher homework loads with native engine installed",
  );
  const sharp = require("sharp"),
    jpeg = await sharp({
      create: { width: 160, height: 120, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
  let savedJpeg, savedHeic;
  for (const [type, bytes] of [
    ["image/jpeg", jpeg],
    ["image/png", await sharp(jpeg).png().toBuffer()],
    ["image/webp", await sharp(jpeg).webp().toBuffer()],
    ["image/heic", await readFile("test/fixtures/homework-synthetic.heic")],
    [
      "image/jpeg",
      Buffer.concat([jpeg, Buffer.alloc(8 * 1048576 - jpeg.length)]),
    ],
  ]) {
    const first = await transfer(bytes, type),
      result = await finalize(first);
    check(
      `first photo verified ${type} ${bytes.length}`,
      result.response.status === 200,
    );
    const last = await transfer(bytes, type, "FINAL", result.data.submissionId),
      done = await finalize(last);
    check(
      `final photo verified ${type} ${bytes.length}`,
      done.response.status === 200,
    );
    const retry = await finalize(last);
    check(
      "finalization retry is idempotent",
      retry.data.recovered === true &&
        retry.data.submissionId === done.data.submissionId,
    );
    const photo = await fetch(
      `${base}/api/homework/photos/${done.data.submissionId}/first`,
      { headers: { Cookie: studentCookie } },
    );
    const photoBytes = await photo.arrayBuffer();
    check(
      `authorized private preview ${type}`,
      photo.status === 200 &&
        photoBytes.byteLength > 0 &&
        photo.headers.get("content-type") ===
          (type === "image/heic" ? "image/jpeg" : type),
    );
    if (type === "image/heic") savedHeic = done.data.submissionId;
    else savedJpeg = done.data.submissionId;
  }
  const pendingFirst = await transfer(jpeg, "image/jpeg"),
    active = await transfer(jpeg, "image/jpeg"),
    running = await finalize(active);
  check(
    "running homework ready for fault test",
    running.response.status === 200,
  );
  const pendingFinal = await transfer(
    jpeg,
    "image/jpeg",
    "FINAL",
    running.data.submissionId,
  );
  const review = (
    await db.query(
      `SELECT e."occurrenceId" FROM homework_expectation e JOIN homework_submission s ON s."expectationId"=e.id WHERE s.id=$1`,
      [savedJpeg],
    )
  ).rows[0].occurrenceId;
  async function teacherPages(state) {
    await page(
      `/teacher/groups/${ids.group}/homework`,
      teacherCookie,
      `teacher workspace loads ${state}`,
      "Create homework schedule",
    );
    await page(
      `/teacher/groups/${ids.group}/homework/${review}`,
      teacherCookie,
      `teacher review loads ${state}`,
      "First photo",
    );
    await page(
      "/teacher/homework/history",
      teacherCookie,
      `teacher global history loads ${state}`,
      "Search and review homework for your assigned groups.",
    );
  }
  await teacherPages("with Sharp available");
  const before = (
    await db.query(
      `SELECT "startedAt"::text,"submittedAt"::text,status FROM homework_submission WHERE id=$1`,
      [running.data.submissionId],
    )
  ).rows[0];
  await stop();
  await start(true);
  await page(
    "/student/homework",
    studentCookie,
    "student homework loads with simulated native initialization failure",
  );
  await page(
    "/teacher/homework",
    teacherCookie,
    "teacher homework loads with simulated native initialization failure",
  );
  await teacherPages("with Sharp unavailable");
  for (const ticket of [pendingFirst, pendingFinal]) {
    const result = await finalize(ticket);
    check(
      "processing fails closed with retryable 503",
      result.response.status === 503 &&
        result.data.code === "IMAGE_PROCESSOR_UNAVAILABLE",
    );
  }
  const after = (
    await db.query(
      `SELECT "startedAt"::text,"submittedAt"::text,status FROM homework_submission WHERE id=$1`,
      [running.data.submissionId],
    )
  ).rows[0];
  check(
    "failed processing does not alter existing timer or submission",
    JSON.stringify(before) === JSON.stringify(after),
  );
  const pendingRows = (
    await db.query(
      `SELECT status FROM homework_photo_upload WHERE id=ANY($1::text[])`,
      [[pendingFirst.id, pendingFinal.id]],
    )
  ).rows;
  check(
    "failed processing keeps both tickets pending",
    pendingRows.every((row) => row.status === "PENDING"),
  );
  const old = await fetch(`${base}/api/homework/photos/${savedJpeg}/first`, {
    headers: { Cookie: studentCookie },
  });
  await old.arrayBuffer();
  check("existing JPEG remains readable without Sharp", old.status === 200);
  const heic = await fetch(`${base}/api/homework/photos/${savedHeic}/first`, {
    headers: { Cookie: studentCookie },
  });
  await heic.arrayBuffer();
  check(
    "HEIC preview returns controlled 503 without Sharp",
    heic.status === 503,
  );
  await page(
    "/student/homework",
    studentCookie,
    "student page still loads after failed Sharp initialization",
  );
  await stop();
  await start();
  for (const ticket of [pendingFirst, pendingFinal]) {
    const result = await finalize(ticket);
    check(
      "same stored photo recovers after processor is restored",
      result.response.status === 200,
    );
  }
  await page(
    "/student/homework",
    studentCookie,
    "student history still loads after recovery",
  );
} finally {
  await stop();
  if (storage) await new Promise((resolve) => storage.server.close(resolve));
  await db.end();
  await writeFile(
    path.join(artifacts, "results.json"),
    JSON.stringify(
      {
        platform: process.platform,
        arch: process.arch,
        node: process.versions.node,
        database: name,
        passed: checks.filter((x) => x.pass).length,
        failed: checks.filter((x) => !x.pass).length,
        checks,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      platform: process.platform,
      database: name,
      passed: checks.filter((x) => x.pass).length,
      failed: checks.filter((x) => !x.pass).length,
      artifacts,
    }),
  );
}
