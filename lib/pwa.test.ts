import { describe, expect, it } from "vitest";

import {
  createDefaultInstallState,
  detectInstallPlatform,
  isInAppBrowser,
  isIosInstallCandidate,
  isIosPushInstallRequired,
  shouldAutoShowInstallPrompt,
  urlBase64ToUint8Array,
} from "@/lib/pwa";

const IOS_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IOS_CHROME_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

describe("pwa helpers", () => {
  it("detects installable iOS Safari user agents", () => {
    expect(isIosInstallCandidate(IOS_SAFARI_UA)).toBe(true);
    expect(isIosInstallCandidate(IOS_CHROME_UA)).toBe(false);
  });

  it("classifies install platforms", () => {
    expect(detectInstallPlatform(IOS_SAFARI_UA)).toBe("ios-safari");
    expect(detectInstallPlatform(IOS_CHROME_UA)).toBe("ios-non-safari");
    expect(detectInstallPlatform(ANDROID_CHROME_UA)).toBe("android");
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      ),
    ).toBe("desktop");
  });

  it("detects in-app browsers", () => {
    expect(
      isInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0",
      ),
    ).toBe(true);
    expect(isInAppBrowser(IOS_SAFARI_UA)).toBe(false);
  });

  it("gates auto-prompt impressions", () => {
    const base = createDefaultInstallState();

    expect(shouldAutoShowInstallPrompt(base)).toBe(false);

    expect(
      shouldAutoShowInstallPrompt({
        ...base,
        visitCount: 2,
      }),
    ).toBe(true);

    expect(
      shouldAutoShowInstallPrompt({
        ...base,
        visitCount: 1,
        firstPracticeAt: Date.now(),
      }),
    ).toBe(true);

    expect(
      shouldAutoShowInstallPrompt({
        ...base,
        visitCount: 2,
        permanent: true,
      }),
    ).toBe(false);

    expect(
      shouldAutoShowInstallPrompt({
        ...base,
        visitCount: 2,
        dismissedUntil: Date.now() + 60_000,
      }),
    ).toBe(false);

    expect(
      shouldAutoShowInstallPrompt({
        ...base,
        visitCount: 2,
        shownCount: 3,
      }),
    ).toBe(false);

    expect(shouldAutoShowInstallPrompt(base, { force: true })).toBe(true);
  });

  it("flags iOS push install requirement on browser tabs", () => {
    expect(isIosPushInstallRequired(IOS_SAFARI_UA)).toBe(true);
    expect(isIosPushInstallRequired(ANDROID_CHROME_UA)).toBe(false);
  });

  it("converts VAPID keys to a Uint8Array", () => {
    expect(Array.from(urlBase64ToUint8Array("AQIDBA"))).toEqual([1, 2, 3, 4]);
  });
});
