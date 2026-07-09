import { describe, expect, it } from "vitest";

import { isIosInstallCandidate, urlBase64ToUint8Array } from "@/lib/pwa";

describe("pwa helpers", () => {
  it("detects installable iOS Safari user agents", () => {
    expect(
      isIosInstallCandidate(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
    expect(
      isIosInstallCandidate(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });

  it("converts VAPID keys to a Uint8Array", () => {
    expect(Array.from(urlBase64ToUint8Array("AQIDBA"))).toEqual([1, 2, 3, 4]);
  });
});
