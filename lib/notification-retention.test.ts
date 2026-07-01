import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTIFICATION_READ_RETENTION_DAYS,
  DEFAULT_NOTIFICATION_UNREAD_RETENTION_DAYS,
  getNotificationRetentionCutoffs,
  getNotificationRetentionPolicy,
} from "@/lib/notification-retention";

describe("getNotificationRetentionPolicy", () => {
  it("uses defaults when env is unset", () => {
    expect(getNotificationRetentionPolicy({})).toEqual({
      readRetentionDays: DEFAULT_NOTIFICATION_READ_RETENTION_DAYS,
      unreadRetentionDays: DEFAULT_NOTIFICATION_UNREAD_RETENTION_DAYS,
    });
  });

  it("parses positive integer overrides", () => {
    expect(
      getNotificationRetentionPolicy({
        NOTIFICATION_READ_RETENTION_DAYS: "30",
        NOTIFICATION_UNREAD_RETENTION_DAYS: "180",
      }),
    ).toEqual({
      readRetentionDays: 30,
      unreadRetentionDays: 180,
    });
  });

  it("falls back on invalid env values", () => {
    expect(
      getNotificationRetentionPolicy({
        NOTIFICATION_READ_RETENTION_DAYS: "0",
        NOTIFICATION_UNREAD_RETENTION_DAYS: "abc",
      }),
    ).toEqual({
      readRetentionDays: DEFAULT_NOTIFICATION_READ_RETENTION_DAYS,
      unreadRetentionDays: DEFAULT_NOTIFICATION_UNREAD_RETENTION_DAYS,
    });
  });
});

describe("getNotificationRetentionCutoffs", () => {
  it("subtracts policy days from now", () => {
    const now = new Date("2026-07-01T12:00:00.000Z");
    const cutoffs = getNotificationRetentionCutoffs(now, {
      readRetentionDays: 90,
      unreadRetentionDays: 365,
    });

    expect(cutoffs.readBefore.toISOString()).toBe("2026-04-02T12:00:00.000Z");
    expect(cutoffs.unreadBefore.toISOString()).toBe("2025-07-01T12:00:00.000Z");
  });
});
