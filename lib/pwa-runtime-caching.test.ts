import { describe, expect, it } from "vitest";
import { NetworkOnly } from "serwist";

import { secureRuntimeCaching } from "@/lib/pwa-runtime-caching";

describe("secureRuntimeCaching", () => {
  it("prepends network-only rules for API and RSC data routes", () => {
    const rules = secureRuntimeCaching([
      {
        matcher: /.*/,
        handler: new NetworkOnly(),
      },
    ]);

    expect(rules).toHaveLength(2);
    expect(rules[0]?.matcher).toBeTypeOf("function");

    const apiMatcher = rules[0]!.matcher as (ctx: {
      url: URL;
      sameOrigin: boolean;
    }) => boolean;

    expect(
      apiMatcher({
        url: new URL("https://example.com/api/auth/session"),
        sameOrigin: true,
      }),
    ).toBe(true);
    expect(
      apiMatcher({
        url: new URL("https://example.com/_next/data/build/student.json"),
        sameOrigin: true,
      }),
    ).toBe(true);
    expect(
      apiMatcher({
        url: new URL("https://example.com/student"),
        sameOrigin: true,
      }),
    ).toBe(false);
    expect(rules[0]?.handler).toBeInstanceOf(NetworkOnly);
  });
});
