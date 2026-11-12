import { readFileSync } from "node:fs";
import { createServer, type Socket } from "node:net";
import { createSecureContext, TLSSocket } from "node:tls";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { prismaCliDatabaseUrl, runtimeDatabaseUrl } from "./database-url";

const neon = "postgresql://test:p%40ss%26word@ep-test-pooler.region.aws.neon.tech/test";
const fixture = (name: string) => fileURLToPath(new URL(`../tests/fixtures/database-tls/${name}`, import.meta.url));

describe("database URL TLS policy", () => {
  it.each(["prefer", "require", "verify-ca"])("makes %s explicitly verify-full without a pg warning", (mode) => {
    const warn = vi.spyOn(process, "emitWarning");
    try {
      const url = runtimeDatabaseUrl(`${neon}?sslmode=${mode}&channel_binding=require&schema=public`)!;
      const parsed = new URL(url);
      expect(parsed.searchParams.get("sslmode")).toBe("verify-full");
      expect(parsed.password).toBe("p%40ss%26word");
      expect(parsed.hostname).toContain("-pooler.");
      expect(parsed.searchParams.get("channel_binding")).toBe("require");
      const client = new Client({ connectionString: url });
      expect(client.ssl).not.toBe(false);
      expect(client.ssl).not.toHaveProperty("rejectUnauthorized", false);
      expect(client.ssl).not.toHaveProperty("checkServerIdentity");
      expect(warn).not.toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });
  it("adds verified TLS to Neon when the mode is missing", () => {
    expect(new URL(runtimeDatabaseUrl(neon)!).searchParams.get("sslmode")).toBe("verify-full");
  });
  it.each([undefined, "", "postgresql://user:pass@localhost:5432/test?schema=public", "postgresql://user:pass@localhost/test?sslmode=disable", `${neon}?sslmode=verify-full`])("preserves unchanged/local URL %s", (value) => {
    expect(runtimeDatabaseUrl(value)).toBe(value);
  });
  it.each(["disable", "no-verify", "unknown", ""])("rejects unsafe Neon mode %s without leaking credentials", (mode) => {
    expect(() => runtimeDatabaseUrl(`${neon}?sslmode=${mode}`)).toThrow("Neon requires TLS");
  });
  it("rejects contradictory Neon SSL settings", () => {
    expect(() => runtimeDatabaseUrl(`${neon}?ssl=false`)).toThrow("Neon requires TLS");
  });
  it.each(["sslmode=require&sslmode=disable", "ssl=true&ssl=false", "host=localhost&host=other", "uselibpqcompat=true&uselibpqcompat=false"])("rejects duplicate security parameters: %s", (query) => {
    expect(() => runtimeDatabaseUrl(`${neon}?${query}`)).toThrow("Duplicate PostgreSQL");
  });
  it("checks pg's effective query host and does not downgrade libpq compatibility", () => {
    expect(new URL(runtimeDatabaseUrl("postgresql://u:p@localhost/test?host=ep-test.neon.tech")!).searchParams.get("sslmode")).toBe("verify-full");
    const client = new Client({ connectionString: runtimeDatabaseUrl(`${neon}?sslmode=require&uselibpqcompat=true`) });
    expect(client.ssl).not.toHaveProperty("rejectUnauthorized", false);
    expect(client.ssl).not.toHaveProperty("checkServerIdentity");
  });
  it.each(["secret-not-a-url", "https://user:secret@example.test"])("does not leak malformed input", (value) => {
    try { runtimeDatabaseUrl(value); throw new Error("Expected validation failure"); }
    catch (error) { expect((error as Error).message).not.toContain(value); expect((error as Error).message).not.toContain("secret"); }
  });
  it("uses Prisma CLI's require + strict syntax while retaining the endpoint and other parameters", () => {
    const url = new URL(prismaCliDatabaseUrl(`${neon}?sslmode=verify-full&schema=public&sslaccept=accept_invalid_certs`)!);
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("sslaccept")).toBe("strict");
    expect(url.searchParams.get("schema")).toBe("public");
    expect(url.hostname).toContain("-pooler.");
    expect(prismaCliDatabaseUrl(undefined)).toBeUndefined();
    const local = "postgresql://u:p@localhost/test";
    expect(prismaCliDatabaseUrl(local)).toBe(local);
  });
  it("maps the trusted server CA to the Prisma schema engine's certificate option", () => {
    const url = new URL(neon);
    url.searchParams.set("sslrootcert", fixture("ca.pem"));
    const cli = new URL(prismaCliDatabaseUrl(url.toString())!);
    expect(cli.searchParams.get("sslcert")).toBe(fixture("ca.pem"));
    expect(cli.searchParams.has("sslrootcert")).toBe(false);
    const runtime = new URL(runtimeDatabaseUrl(url.toString())!);
    expect(runtime.searchParams.get("sslrootcert")).toBe(fixture("ca.pem"));
  });
  it("does not silently overwrite conflicting CLI certificate options", () => {
    expect(() => prismaCliDatabaseUrl(`${neon}?sslcert=client.pem&sslrootcert=ca.pem`)).toThrow("Conflicting Prisma CLI certificate options");
  });
});

// A tiny synthetic PostgreSQL TLS handshake, not a database or student data.
// Committed keys/certificates are public test fixtures, never production keys.
async function tlsHandshake(cert: string, trusted: boolean) {
  const sockets = new Set<Socket>();
  const secureContext = createSecureContext({ key: readFileSync(fixture("server-key.pem")), cert: readFileSync(fixture(cert)) });
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => socket.destroy());
    socket.once("data", () => {
      socket.write("S"); // PostgreSQL SSLRequest response.
      const tls = new TLSSocket(socket, { isServer: true, secureContext });
      tls.on("error", () => tls.destroy());
      tls.once("data", () => {
        const authenticated = Buffer.from([82, 0, 0, 0, 8, 0, 0, 0, 0]);
        const ready = Buffer.from([90, 0, 0, 0, 5, 73]);
        tls.write(Buffer.concat([authenticated, ready]));
        tls.on("data", () => tls.end());
      });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = new URL(`postgresql://synthetic:synthetic@localhost:${address.port}/synthetic?sslmode=require`);
  if (trusted) url.searchParams.set("sslrootcert", fixture("ca.pem"));
  const client = new Client({ connectionString: runtimeDatabaseUrl(url.toString()), connectionTimeoutMillis: 2000 });
  try { await client.connect(); }
  finally {
    await client.end().catch(() => undefined);
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("real pg TLS handshake (synthetic local server)", () => {
  it("accepts a trusted certificate for the correct hostname", async () => {
    await expect(tlsHandshake("server.pem", true)).resolves.toBeUndefined();
  });
  it("rejects an untrusted CA", async () => {
    await expect(tlsHandshake("server.pem", false)).rejects.toMatchObject({ code: expect.stringMatching(/CERT|ISSUER|SIGNATURE/) });
  });
  it("rejects a trusted certificate for a different hostname", async () => {
    await expect(tlsHandshake("wrong-host.pem", true)).rejects.toMatchObject({ code: "ERR_TLS_CERT_ALTNAME_INVALID" });
  });
});
