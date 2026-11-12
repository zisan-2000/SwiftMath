/**
 * pg 8 treats these modes as verify-full today, but warns that pg 9 will
 * weaken them. Make the existing certificate AND hostname checks explicit.
 * Never log the input: it contains database credentials.
 */
export function runtimeDatabaseUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Expected a PostgreSQL connection URL.");
  }
  // pg uses the LAST duplicate value; rejecting ambiguity prevents divergent
  // validation between this helper and the driver. A host query overrides DNS.
  for (const key of ["host", "ssl", "sslmode", "uselibpqcompat"]) {
    if (url.searchParams.getAll(key).length > 1) {
      throw new Error("Duplicate PostgreSQL connection security parameters.");
    }
  }
  const host = (url.searchParams.get("host") ?? url.hostname).toLowerCase();
  const neon = host.endsWith(".neon.tech");
  const mode = url.searchParams.get("sslmode");
  if (neon && (
    (mode !== null && !["prefer", "require", "verify-ca", "verify-full"].includes(mode)) ||
    url.searchParams.get("ssl") === "false"
  )) {
    throw new Error("Neon requires TLS with certificate and hostname verification.");
  }
  if ((mode && ["prefer", "require", "verify-ca"].includes(mode)) || (neon && !mode)) {
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  }
  // Local PostgreSQL without TLS and already strict URLs remain unchanged.
  return value;
}

/** Prisma's schema/migration engine uses different TLS URL options than pg. */
export function prismaCliDatabaseUrl(value: string | undefined): string | undefined {
  const runtimeUrl = runtimeDatabaseUrl(value);
  if (!runtimeUrl) return runtimeUrl;
  const url = new URL(runtimeUrl);
  if (url.searchParams.get("sslmode") !== "verify-full") return runtimeUrl;
  // The schema engine accepts require/prefer/disable, not verify-full.
  // strict is essential: require alone does not require a valid certificate.
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  // pg calls the trusted server CA sslrootcert; the schema engine calls it
  // sslcert (not a pg-style client certificate). Do not silently replace one.
  const ca = url.searchParams.get("sslrootcert");
  if (ca) {
    if (url.searchParams.has("sslcert") && url.searchParams.get("sslcert") !== ca) {
      throw new Error("Conflicting Prisma CLI certificate options; use a dedicated DIRECT_URL.");
    }
    url.searchParams.set("sslcert", ca);
    url.searchParams.delete("sslrootcert");
  }
  return url.toString();
}
