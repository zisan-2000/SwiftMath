"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificationListItem } from "@/lib/notifications";
import type { NotificationSummaryPayload } from "@/lib/notification-poll";
import { DEFAULT_NOTIFICATION_POLL_INTERVAL_MS } from "@/lib/notification-poll";

function parseSummary(payload: NotificationSummaryPayload): {
  unreadCount: number;
  recent: NotificationListItem[];
} {
  return {
    unreadCount: payload.unreadCount,
    recent: payload.recent.map((item) => ({
      id: item.id,
      type: item.type as NotificationListItem["type"],
      title: item.title,
      body: item.body,
      href: item.href,
      readAt: item.readAt ? new Date(item.readAt) : null,
      createdAt: new Date(item.createdAt),
    })),
  };
}

/**
 * Poll /api/notifications/summary while the tab is visible (N10).
 * Returns live unread count, recent rows, and a pulse flag when count rises.
 */
export function useNotificationBellSync(input: {
  initialUnreadCount: number;
  initialRecent: NotificationListItem[];
  pollIntervalMs?: number;
  enabled?: boolean;
}) {
  const pollIntervalMs =
    input.pollIntervalMs ?? DEFAULT_NOTIFICATION_POLL_INTERVAL_MS;
  const enabled = input.enabled ?? true;

  const [unreadCount, setUnreadCount] = useState(input.initialUnreadCount);
  const [recent, setRecent] = useState(input.initialRecent);
  const [hasNewUnread, setHasNewUnread] = useState(false);

  const unreadRef = useRef(input.initialUnreadCount);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUnreadCount(input.initialUnreadCount);
    setRecent(input.initialRecent);
    unreadRef.current = input.initialUnreadCount;
  }, [input.initialUnreadCount, input.initialRecent]);

  const applySummary = useCallback((summary: NotificationSummaryPayload) => {
    const parsed = parseSummary(summary);
    setUnreadCount(parsed.unreadCount);
    setRecent(parsed.recent);

    if (parsed.unreadCount > unreadRef.current) {
      setHasNewUnread(true);
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
      pulseTimeoutRef.current = setTimeout(() => {
        setHasNewUnread(false);
      }, 2500);
    }

    unreadRef.current = parsed.unreadCount;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch("/api/notifications/summary", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as NotificationSummaryPayload;
      applySummary(data);
    } catch {
      // Ignore transient network errors — next poll will retry.
    }
  }, [applySummary, enabled]);

  useEffect(() => {
    if (!enabled) return;

    function startPolling() {
      if (document.visibilityState !== "visible") return;
      void refresh();
    }

    startPolling();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, pollIntervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const onFocus = () => {
      void refresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [enabled, pollIntervalMs, refresh]);

  function decrementUnread() {
    setUnreadCount((count) => {
      const next = Math.max(0, count - 1);
      unreadRef.current = next;
      return next;
    });
  }

  return {
    unreadCount,
    recent,
    hasNewUnread,
    refresh,
    decrementUnread,
  };
}
