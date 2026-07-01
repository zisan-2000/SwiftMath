import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { verifyCronSecret } from "@/lib/cron-auth";

describe("verifyCronSecret", () => {
  const originalSecret = process.env.CRON_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("allows any request in development when CRON_SECRET is unset", () => {
    process.env.NODE_ENV = "development";
    const request = new Request("http://localhost/api/cron/notifications");
    expect(verifyCronSecret(request)).toBe(true);
  });

  it("rejects when CRON_SECRET is unset outside development", () => {
    process.env.NODE_ENV = "production";
    const request = new Request("http://localhost/api/cron/notifications");
    expect(verifyCronSecret(request)).toBe(false);
  });

  it("accepts a matching bearer token", () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.NODE_ENV = "production";
    const request = new Request("http://localhost/api/cron/notifications", {
      headers: { authorization: "Bearer test-secret" },
    });
    expect(verifyCronSecret(request)).toBe(true);
  });

  it("rejects a wrong bearer token", () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.NODE_ENV = "production";
    const request = new Request("http://localhost/api/cron/notifications", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(verifyCronSecret(request)).toBe(false);
  });
});
