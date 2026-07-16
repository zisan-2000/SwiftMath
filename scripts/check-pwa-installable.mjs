/**
 * PWA installability smoke check for CI.
 *
 * Lighthouse 12+ removed the dedicated "pwa" category, so we verify the same
 * prerequisites directly: manifest, service worker, and login entry page.
 */

const BASE = (process.env.PWA_CHECK_BASE ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);

/** @param {string} label @param {Response} response */
function assertOk(label, response) {
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status} ${response.statusText}`);
  }
}

/** @param {unknown} manifest */
function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Manifest is not a JSON object");
  }

  const m = /** @type {Record<string, unknown>} */ (manifest);

  for (const key of ["name", "short_name", "start_url", "display"]) {
    if (typeof m[key] !== "string" || !String(m[key]).trim()) {
      throw new Error(`Manifest missing or invalid "${key}"`);
    }
  }

  if (m.display !== "standalone") {
    throw new Error(`Manifest display must be "standalone", got "${m.display}"`);
  }

  if (!Array.isArray(m.icons) || m.icons.length < 2) {
    throw new Error("Manifest must include at least two icons");
  }

  const has192 = m.icons.some(
    (icon) =>
      icon &&
      typeof icon === "object" &&
      String(/** @type {{ sizes?: string }} */ (icon).sizes).includes("192"),
  );
  const has512 = m.icons.some(
    (icon) =>
      icon &&
      typeof icon === "object" &&
      String(/** @type {{ sizes?: string }} */ (icon).sizes).includes("512"),
  );

  if (!has192 || !has512) {
    throw new Error("Manifest icons must include 192x192 and 512x512 sizes");
  }
}

async function main() {
  const manifestRes = await fetch(`${BASE}/manifest.webmanifest`, {
    redirect: "follow",
  });
  assertOk("Manifest", manifestRes);
  const manifestType = manifestRes.headers.get("content-type") ?? "";
  if (!manifestType.includes("json") && !manifestType.includes("manifest")) {
    console.warn(`Warning: manifest content-type is "${manifestType}"`);
  }
  validateManifest(await manifestRes.json());

  const swRes = await fetch(`${BASE}/serwist/sw.js`, { redirect: "follow" });
  assertOk("Service worker", swRes);
  const swType = swRes.headers.get("content-type") ?? "";
  if (!swType.includes("javascript")) {
    throw new Error(`Service worker content-type must be JavaScript, got "${swType}"`);
  }
  const swBody = await swRes.text();
  if (swBody.length < 50) {
    throw new Error("Service worker response looks empty");
  }

  const loginRes = await fetch(`${BASE}/login`, { redirect: "follow" });
  assertOk("Login page", loginRes);
  const loginHtml = await loginRes.text();
  if (!loginHtml.includes("manifest") && !loginHtml.includes("webmanifest")) {
    console.warn("Warning: login HTML may not link the manifest (check root metadata)");
  }

  console.log(`PWA installability checks OK (${BASE})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
