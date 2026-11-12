"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { trackPwaEvent } from "@/lib/pwa-analytics";
import { subscribeInstallPromptVisibility } from "@/lib/pwa-ui-coordination";
import { shouldRegisterServiceWorker } from "@/lib/pwa";
import { Button } from "@/components/ui/button";

export function PwaRuntime() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  const [noticeHost, setNoticeHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!waitingWorker) return;
    // A streamed route can mount its shell AFTER the URL has changed. Observe
    // structural changes while an update is pending, including replaced slots.
    const resolveHost = () => {
      const host = document.getElementById("app-update-notice");
      setNoticeHost((current) => (current === host ? current : host));
    };
    resolveHost();
    const observer = new MutationObserver(resolveHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [waitingWorker]);

  useEffect(() => {
    return subscribeInstallPromptVisibility(setInstallPromptOpen);
  }, []);

  useEffect(() => {
    if (!shouldRegisterServiceWorker()) {
      return;
    }

    let cancelled = false;

    navigator.serviceWorker.ready
      .then((registration) => {
        if (cancelled) {
          return;
        }

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(worker);
            }
          });
        });
      })
      .catch((error) => {
        console.error("[pwa] service worker readiness failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function applyUpdate() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    trackPwaEvent("pwa_update_accept");
    toast.info("Refreshing app");
    window.location.reload();
  }

  function dismissUpdate() {
    trackPwaEvent("pwa_update_dismiss");
    setWaitingWorker(null);
  }

  if (!waitingWorker || installPromptOpen) {
    return null;
  }

  const notice = (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 text-sm print:hidden lg:px-8"
    >
      <div className="min-w-0">
        <p className="font-medium text-card-foreground">Update available</p>
        <p className="sr-only text-muted-foreground sm:not-sr-only">Refresh to use the latest app.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={applyUpdate}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismissUpdate}
          aria-label="Dismiss update notice"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  // In-flow on every page; never cover homework controls or dashboard content.
  return noticeHost ? createPortal(notice, noticeHost) : notice;
}
