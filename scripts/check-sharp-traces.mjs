import {
  readFile,
  realpath,
  mkdtemp,
  mkdir,
  copyFile,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { checkSharpRuntime } from "./check-sharp-runtime.mjs";

export const homeworkTraces = [
  "student/homework/page.js.nft.json",
  "teacher/homework/page.js.nft.json",
  "api/student/homework/uploads/[uploadId]/route.js.nft.json",
  "api/homework/photos/[submissionId]/[kind]/route.js.nft.json",
];

export async function checkSharpTraces(root = process.cwd()) {
  if (process.platform !== "linux" || process.arch !== "x64") {
    console.log(
      "Sharp Linux trace check skipped on this OS; Linux x64 verification is required before release.",
    );
    return;
  }
  const { nativeFiles } = await checkSharpRuntime(root);
  const required = await Promise.all(nativeFiles.map((file) => realpath(file)));
  let uploadFiles;
  for (const trace of homeworkTraces) {
    const file = path.join(root, ".next/server/app", trace);
    const manifest = JSON.parse(await readFile(file, "utf8"));
    if (trace.includes("uploads/"))
      uploadFiles = [...manifest.files].map((relative) =>
        path.resolve(path.dirname(file), relative),
      );
    const files = new Set(
      await Promise.all(
        manifest.files.map((relative) =>
          realpath(path.resolve(path.dirname(file), relative)),
        ),
      ),
    );
    for (const asset of required)
      if (!files.has(asset))
        throw new Error(
          `Missing Sharp native asset in ${trace}: ${path.basename(asset)}`,
        );
  }
  // Exercise a fresh process with ONLY traced Sharp files, outside the project.
  // A full node_modules install can hide the very packaging defect we are fixing.
  const artifact = await mkdtemp(path.join(tmpdir(), "swiftmath-sharp-trace-"));
  const packages = [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-libvips-linux-x64",
    "@img/colour",
    "detect-libc",
    "semver",
  ];
  const copied = new Set();
  let passed = false;
  try {
    for (const original of uploadFiles) {
      const source = await realpath(original);
      const relative = path
        .relative(await realpath(root), source)
        .split(path.sep)
        .join("/");
      if (
        !packages.some((name) =>
          relative.startsWith(`node_modules/${name}/`),
        ) ||
        copied.has(relative)
      )
        continue;
      const target = path.join(artifact, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      copied.add(relative);
    }
    await copyFile(
      path.join(root, "package.json"),
      path.join(artifact, "package.json"),
    );
    const probe = path.join(artifact, "check-sharp-runtime.mjs");
    await copyFile(path.join(root, "scripts/check-sharp-runtime.mjs"), probe);
    const result = spawnSync(process.execPath, [probe], {
      cwd: artifact,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_PATH: "",
        NODE_OPTIONS: "",
        LD_LIBRARY_PATH: "",
      },
    });
    if (result.status !== 0)
      throw new Error(
        `Traced-only Sharp runtime failed: ${result.stderr || result.error?.message || result.status}`,
      );
    passed = true;
  } finally {
    if (
      passed &&
      path
        .resolve(artifact)
        .startsWith(
          path.resolve(tmpdir()) + path.sep + "swiftmath-sharp-trace-",
        )
    )
      await rm(artifact, { recursive: true, force: true });
  }
  console.log(
    JSON.stringify({
      event: "sharp-linux-traces",
      tracesVerified: homeworkTraces.length,
      requiredFiles: nativeFiles.length,
      tracedOnlyRuntime: "passed",
      copiedFiles: copied.size,
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  checkSharpTraces().catch((error) => {
    console.error("Sharp output tracing check failed:", error.message);
    process.exitCode = 1;
  });
}
