// Notification retention policy — pure date helpers (N8).

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Default days to keep read in-app notifications. */
export const DEFAULT_NOTIFICATION_READ_RETENTION_DAYS = 90;

/** Default days to keep unread in-app notifications. */
export const DEFAULT_NOTIFICATION_UNREAD_RETENTION_DAYS = 365;

export interface NotificationRetentionPolicy {
  readRetentionDays: number;
  unreadRetentionDays: number;
}

export interface NotificationRetentionCutoffs {
  readBefore: Date;
  unreadBefore: Date;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Load retention windows from env with safe defaults. */
export function getNotificationRetentionPolicy(
  env: NodeJS.ProcessEnv = process.env,
): NotificationRetentionPolicy {
  return {
    readRetentionDays: parsePositiveInt(
      env.NOTIFICATION_READ_RETENTION_DAYS,
      DEFAULT_NOTIFICATION_READ_RETENTION_DAYS,
    ),
    unreadRetentionDays: parsePositiveInt(
      env.NOTIFICATION_UNREAD_RETENTION_DAYS,
      DEFAULT_NOTIFICATION_UNREAD_RETENTION_DAYS,
    ),
  };
}

/** Cutoff timestamps for purging stale notification rows. */
export function getNotificationRetentionCutoffs(
  now: Date,
  policy: NotificationRetentionPolicy,
): NotificationRetentionCutoffs {
  return {
    readBefore: new Date(now.getTime() - policy.readRetentionDays * MS_PER_DAY),
    unreadBefore: new Date(
      now.getTime() - policy.unreadRetentionDays * MS_PER_DAY,
    ),
  };
}
