import { describe, expect, it } from "vitest";

import {
  PWA_ANALYTICS_EVENTS,
  isPwaAnalyticsEvent,
} from "@/lib/pwa-analytics";

describe("pwa analytics", () => {
  it("recognises allowlisted events", () => {
    for (const event of PWA_ANALYTICS_EVENTS) {
      expect(isPwaAnalyticsEvent(event)).toBe(true);
    }

    expect(isPwaAnalyticsEvent("pwa_prompt_shown")).toBe(true);
    expect(isPwaAnalyticsEvent("not_a_real_event")).toBe(false);
  });
});
