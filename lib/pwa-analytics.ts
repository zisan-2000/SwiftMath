/** Product analytics events for the PWA install funnel (Phase C / Sprint 2). */

export const PWA_ANALYTICS_EVENTS = [
  "pwa_prompt_shown",
  "pwa_prompt_snoozed",
  "pwa_prompt_dismissed_permanent",
  "pwa_install_clicked",
  "pwa_install_accepted",
  "pwa_install_declined",
  "pwa_appinstalled",
  "pwa_push_followup_shown",
  "pwa_push_followup_clicked",
  "pwa_push_followup_dismissed",
  "pwa_update_accept",
  "pwa_update_dismiss",
  "pwa_help_opened",
] as const;

export type PwaAnalyticsEvent = (typeof PWA_ANALYTICS_EVENTS)[number];

export type PwaAnalyticsMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface PwaAnalyticsPayload {
  event: PwaAnalyticsEvent;
  metadata?: PwaAnalyticsMetadata;
  ts: number;
}

export function isPwaAnalyticsEvent(value: string): value is PwaAnalyticsEvent {
  return (PWA_ANALYTICS_EVENTS as readonly string[]).includes(value);
}

/** Fire-and-forget client event — dev logs locally, prod posts to `/api/pwa/analytics`. */
export function trackPwaEvent(
  event: PwaAnalyticsEvent,
  metadata?: PwaAnalyticsMetadata,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PwaAnalyticsPayload = {
    event,
    metadata,
    ts: Date.now(),
  };

  if (process.env.NODE_ENV === "development") {
    console.info("[pwa-analytics]", payload);
  }

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/pwa/analytics", blob)) {
        return;
      }
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch("/api/pwa/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never block UX.
  });
}
