import { createRequire } from "node:module";
import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function checkSharpRuntime(root = process.cwd()) {
  const require = createRequire(path.join(root, "package.json"));
  const sharp = require("sharp");
  const project = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  if (sharp.versions.sharp !== project.dependencies.sharp)
    throw new Error("Sharp must match the exact application version pin.");
  const nativeFiles = [];
  if (process.platform === "linux" && process.arch === "x64") {
    if (!process.report.getReport().header.glibcVersionRuntime)
      throw new Error(
        "Run the production check on Linux x64 glibc, matching Vercel.",
      );
    const packages = ["@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64"];
    for (const name of packages) {
      const manifest = require.resolve(`${name}/package`);
      const installed = JSON.parse(await readFile(manifest, "utf8"));
      if (installed.version !== project.optionalDependencies[name])
        throw new Error(`Mismatched production native package: ${name}`);
      const binary =
        name === packages[0]
          ? `lib/sharp-linux-x64-${sharp.versions.sharp}.node`
          : `lib/libvips-cpp.so.${sharp.versions.vips}`;
      const file = path.join(path.dirname(manifest), binary);
      await access(file);
      if (name === packages[0] && !require.cache[await realpath(file)])
        throw new Error(
          "Sharp's Linux native addon did not load; a WASM fallback cannot pass production preflight.",
        );
      nativeFiles.push(manifest, file);
    }
  }
  // A successful require alone is insufficient: exercise native decoding too.
  for (const format of ["jpeg", "png", "webp"]) {
    const bytes = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "#fff" },
    })
      [format]()
      .toBuffer();
    await sharp(bytes).raw().toBuffer();
  }
  return {
    platform: process.platform,
    arch: process.arch,
    sharp: sharp.versions.sharp,
    libvips: sharp.versions.vips,
    nativeFiles,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  checkSharpRuntime()
    .then(({ nativeFiles, ...result }) =>
      console.log(
        JSON.stringify({
          event: "sharp-runtime-check",
          ...result,
          nativeFilesVerified: nativeFiles.length,
        }),
      ),
    )
    .catch((error) => {
      console.error("Sharp production preflight failed:", error.message);
      process.exitCode = 1;
    });
}
