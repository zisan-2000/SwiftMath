"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import {
  PWA_INSTALL_DISMISSED_KEY,
  isIosInstallCandidate,
  isStandaloneDisplay,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

function readDismissed(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "1";
}

export function StudentInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(
    () =>
      typeof window !== "undefined" &&
      !readDismissed() &&
      !isStandaloneDisplay() &&
      isIosInstallCandidate(window.navigator.userAgent),
  );

  useEffect(() => {
    if (isStandaloneDisplay() || dismissed) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [dismissed]);

  function close() {
    window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
    setDismissed(true);
    setPromptEvent(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setPromptEvent(null);
  }

  if (dismissed || installed || (!promptEvent && !showIosHint)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg rounded-md border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground">Install SEFT Abacus</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open practice faster from your home screen with app-style launch.
          </p>
          {showIosHint ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Share className="h-4 w-4" />
              Use Share, then Add to Home Screen.
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Dismiss install prompt"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {promptEvent ? (
        <div className="mt-3">
          <Button size="sm" onClick={install}>
            <Download className="h-4 w-4" />
            Install
          </Button>
        </div>
      ) : null}
    </div>
  );
}
