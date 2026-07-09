/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

import { secureRuntimeCaching } from "../lib/pwa-runtime-caching";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // User-controlled refresh via PwaRuntime (SKIP_WAITING message).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: secureRuntimeCaching(defaultCache),
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "SEFT Abacus",
    body: "You have a new notification.",
    href: "/student/notifications",
  };
  const data = event.data ? event.data.json() : fallback;
  const options = {
    body: data.body || fallback.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-96.png",
    tag: data.tag || "swiftmath-notification",
    renotify: Boolean(data.renotify),
    vibrate: [120, 50, 120],
    data: {
      href: data.href || fallback.href,
      arrivedAt: Date.now(),
    },
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    (event.notification.data?.href as string | undefined) ||
    "/student/notifications";
  const targetUrl = new URL(href, self.location.origin);
  if (targetUrl.origin !== self.location.origin) {
    targetUrl.href = `${self.location.origin}/student/notifications`;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((client) => client.url === targetUrl.href);
        if (existing) {
          return existing.focus();
        }
        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
