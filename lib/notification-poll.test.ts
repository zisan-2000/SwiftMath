import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTIFICATION_POLL_INTERVAL_MS,
  getNotificationPollIntervalMs,
} from "@/lib/notification-poll";

describe("getNotificationPollIntervalMs", () => {
  it("defaults to 60 seconds", () => {
    expect(getNotificationPollIntervalMs({})).toBe(
      DEFAULT_NOTIFICATION_POLL_INTERVAL_MS,
    );
  });

  it("parses a valid override", () => {
    expect(
      getNotificationPollIntervalMs({ NOTIFICATION_POLL_INTERVAL_MS: "30000" }),
    ).toBe(30_000);
  });

  it("rejects values below 15 seconds", () => {
    expect(
      getNotificationPollIntervalMs({ NOTIFICATION_POLL_INTERVAL_MS: "5000" }),
    ).toBe(DEFAULT_NOTIFICATION_POLL_INTERVAL_MS);
  });
});
