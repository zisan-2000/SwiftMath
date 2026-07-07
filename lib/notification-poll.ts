// Client polling interval for the notification bell (N10).

/** Default bell refresh interval while the tab is visible. */
export const DEFAULT_NOTIFICATION_POLL_INTERVAL_MS = 60_000;

/** JSON shape from GET /api/notifications/summary. */
export interface NotificationSummaryPayload {
  unreadCount: number;
  recent: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    href: string;
    readAt: string | null;
    createdAt: string;
  }>;
  /** Student-only: an exam window is open or an attempt is in progress. */
  hasPendingExam?: boolean;
}

/** Parse poll interval from env (server) or use default. */
export function getNotificationPollIntervalMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.NOTIFICATION_POLL_INTERVAL_MS?.trim();
  if (!raw) return DEFAULT_NOTIFICATION_POLL_INTERVAL_MS;
  const ms = Number.parseInt(raw, 10);
  return Number.isInteger(ms) && ms >= 15_000 ? ms : DEFAULT_NOTIFICATION_POLL_INTERVAL_MS;
}
