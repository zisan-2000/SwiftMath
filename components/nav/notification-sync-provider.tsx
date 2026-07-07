"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Role } from "@/lib/generated/prisma/enums";
import type { NotificationListItem } from "@/lib/notifications";
import type { NotificationSummaryPayload } from "@/lib/notification-poll";
import { DEFAULT_NOTIFICATION_POLL_INTERVAL_MS } from "@/lib/notification-poll";
import { buildNavBadges, type NavBadgeMap } from "@/lib/nav-badges";
import {
  isSoundAlertNotificationType,
  playNotificationChime,
  readNotificationSoundEnabled,
} from "@/lib/notification-sound";

interface NotificationSyncState {
  unreadCount: number;
  recent: NotificationListItem[];
  hasPendingExam: boolean;
  hasNewUnread: boolean;
  navBadges: NavBadgeMap;
  refresh: () => Promise<void>;
  decrementUnread: () => void;
}

const NotificationSyncContext = createContext<NotificationSyncState | null>(null);

function parseSummary(payload: NotificationSummaryPayload): {
  unreadCount: number;
  recent: NotificationListItem[];
  hasPendingExam: boolean;
} {
  return {
    unreadCount: payload.unreadCount,
    hasPendingExam: payload.hasPendingExam ?? false,
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

/** Shared notification poll state for the bell and sidebar badges. */
export function NotificationSyncProvider({
  role,
  initial,
  pollIntervalMs = DEFAULT_NOTIFICATION_POLL_INTERVAL_MS,
  enabled = true,
  children,
}: {
  role: Role;
  initial: NotificationSummaryPayload;
  pollIntervalMs?: number;
  enabled?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const parsedInitial = parseSummary(initial);

  const [unreadCount, setUnreadCount] = useState(parsedInitial.unreadCount);
  const [recent, setRecent] = useState(parsedInitial.recent);
  const [hasPendingExam, setHasPendingExam] = useState(
    parsedInitial.hasPendingExam,
  );
  const [hasNewUnread, setHasNewUnread] = useState(false);

  const unreadRef = useRef(parsedInitial.unreadCount);
  const recentIdsRef = useRef(new Set(parsedInitial.recent.map((item) => item.id)));
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const parsed = parseSummary(initial);
    setUnreadCount(parsed.unreadCount);
    setRecent(parsed.recent);
    setHasPendingExam(parsed.hasPendingExam);
    unreadRef.current = parsed.unreadCount;
    recentIdsRef.current = new Set(parsed.recent.map((item) => item.id));
  }, [initial]);

  const applySummary = useCallback(
    (summary: NotificationSummaryPayload) => {
      const parsed = parseSummary(summary);
      setUnreadCount(parsed.unreadCount);
      setRecent(parsed.recent);
      setHasPendingExam(parsed.hasPendingExam);

      const seenIds = recentIdsRef.current;
      const unseenNew = parsed.recent.filter(
        (item) => item.readAt == null && !seenIds.has(item.id),
      );
      const unseenImportant = unseenNew.filter((item) =>
        isSoundAlertNotificationType(item.type),
      );

      if (parsed.unreadCount > unreadRef.current) {
        setHasNewUnread(true);
        if (pulseTimeoutRef.current) {
          clearTimeout(pulseTimeoutRef.current);
        }
        pulseTimeoutRef.current = setTimeout(() => {
          setHasNewUnread(false);
        }, 2500);
      }

      if (document.visibilityState === "visible") {
        if (unseenImportant.length > 0 && readNotificationSoundEnabled()) {
          void playNotificationChime();
        }

        if (unseenNew.length > 0) {
          const latest = unseenNew[0];
          toast(latest.title, {
            description: latest.body,
            action: latest.href
              ? {
                  label: "Open",
                  onClick: () => router.push(latest.href),
                }
              : undefined,
          });
        }
      }

      unreadRef.current = parsed.unreadCount;
      recentIdsRef.current = new Set(parsed.recent.map((item) => item.id));
    },
    [router],
  );

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

  const decrementUnread = useCallback(() => {
    setUnreadCount((count) => {
      const next = Math.max(0, count - 1);
      unreadRef.current = next;
      return next;
    });
  }, []);

  const value: NotificationSyncState = {
    unreadCount,
    recent,
    hasPendingExam,
    hasNewUnread,
    navBadges: buildNavBadges(role, { unreadCount, hasPendingExam }),
    refresh,
    decrementUnread,
  };

  return (
    <NotificationSyncContext.Provider value={value}>
      {children}
    </NotificationSyncContext.Provider>
  );
}

export function useNotificationSync(): NotificationSyncState {
  const context = useContext(NotificationSyncContext);
  if (!context) {
    throw new Error(
      "useNotificationSync must be used within NotificationSyncProvider",
    );
  }
  return context;
}
