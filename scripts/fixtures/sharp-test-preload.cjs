// Test processes only. No production credentials or storage endpoints are used.
/* eslint-disable @typescript-eslint/no-require-imports -- Node --require preloads run before the ESM application. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { MockAgent, setGlobalDispatcher } = require("undici");
if (
  !/^\/swiftmath_sharp_test_\d+$/.test(
    new URL(process.env.DATABASE_URL).pathname,
  ) ||
  process.env.BLOB_READ_WRITE_TOKEN !==
    "vercel_blob_rw_sharptest_SYNTHETIC_ONLY"
)
  throw Error("Isolated Sharp smoke process required");
const mock = new MockAgent();
mock.disableNetConnect();
mock.enableNetConnect(/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/);
mock
  .get("https://sharptest.private.blob.vercel-storage.com")
  .intercept({ path: /.*/, method: "GET" })
  .reply((options) => {
    const pathname = decodeURIComponent(
      new URL(
        options.path,
        "https://sharptest.private.blob.vercel-storage.com",
      ).pathname.slice(1),
    );
    const file = path.join(
      process.env.SHARP_TEST_PHOTO_DIR,
      crypto.createHash("sha256").update(pathname).digest("hex"),
    );
    if (!fs.existsSync(file)) return { statusCode: 404, data: "" };
    const meta = JSON.parse(fs.readFileSync(file + ".json", "utf8"));
    return {
      statusCode: 200,
      data: fs.readFileSync(file),
      responseOptions: {
        headers: {
          "content-type": meta.contentType,
          "content-length": String(meta.size),
        },
      },
    };
  })
  .persist();
setGlobalDispatcher(mock);
if (process.env.SHARP_TEST_FAIL_NATIVE === "1") {
  // Some developer installs contain an extraneous WASM fallback. Block that too
  // so the fault test actually models an unavailable image engine.
  const Module = require("node:module");
  const load = Module._load;
  Module._load = function (request, ...args) {
    if (
      typeof request === "string" &&
      request.startsWith("@img/sharp-") &&
      request.includes("wasm")
    ) {
      const error = new Error("Synthetic unavailable Sharp fallback");
      error.code = "MODULE_NOT_FOUND";
      throw error;
    }
    return load.call(this, request, ...args);
  };
  const original = process.dlopen;
  process.dlopen = function (module, filename, ...args) {
    if (
      path.basename(filename).startsWith("sharp-") &&
      filename.replaceAll("\\", "/").includes("/@img/")
    ) {
      const error = new Error("Synthetic missing libvips runtime asset");
      error.code = "ERR_DLOPEN_FAILED";
      throw error;
    }
    return original.call(this, module, filename, ...args);
  };
}
