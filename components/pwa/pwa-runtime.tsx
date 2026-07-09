"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { shouldRegisterServiceWorker } from "@/lib/pwa";
import { Button } from "@/components/ui/button";

export function PwaRuntime() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

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
    toast.info("Refreshing app");
    window.location.reload();
  }

  if (!waitingWorker) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md border bg-card p-3 text-sm shadow-lg">
      <div className="min-w-0">
        <p className="font-medium text-card-foreground">Update available</p>
        <p className="text-muted-foreground">Refresh to use the latest app.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={applyUpdate}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWaitingWorker(null)}
          aria-label="Dismiss update notice"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
