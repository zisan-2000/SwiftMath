"use client";

import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";

import { SERVICE_WORKER_PATH, shouldRegisterServiceWorker } from "@/lib/pwa";

/**
 * Registers the Serwist service worker in production (or dev when
 * NEXT_PUBLIC_ENABLE_PWA_DEV=1). Disables proactive navigation caching
 * so user-specific routes are not prefetched into Cache Storage.
 */
export function PwaShell({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl={SERVICE_WORKER_PATH}
      disable={!shouldRegisterServiceWorker()}
      cacheOnNavigation={false}
    >
      {children}
    </SerwistProvider>
  );
}
