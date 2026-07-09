import type { RuntimeCaching } from "serwist";
import { NetworkOnly } from "serwist";

/**
 * Prepends network-only rules so auth, API, and RSC flight data are never
 * served from the service worker cache (matches the manual SW security model).
 */
export function secureRuntimeCaching(
  baseCache: RuntimeCaching[],
): RuntimeCaching[] {
  return [
    {
      matcher: ({ url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        (pathname.startsWith("/api/") || pathname.startsWith("/_next/data/")),
      handler: new NetworkOnly(),
    },
    ...baseCache,
  ];
}
