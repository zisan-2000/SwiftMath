"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  detectInstallPlatform,
  isStandaloneDisplay,
  markInstallCompleted,
  readInstallState,
  type PwaInstallPlatform,
} from "@/lib/pwa";
import { trackPwaEvent } from "@/lib/pwa-analytics";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

interface PwaInstallContextValue {
  ready: boolean;
  installed: boolean;
  canNativeInstall: boolean;
  platform: PwaInstallPlatform;
  promptInstall: () => Promise<InstallOutcome>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

/**
 * Captures the one-shot browser install event at the root so it survives route
 * changes between the public pages and authenticated dashboards.
 */
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaInstallPlatform>("unknown");
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function syncInstalledState() {
      setInstalled(
        isStandaloneDisplay() || readInstallState().installedAt !== null,
      );
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      // A fresh browser prompt means the app is installable on this device,
      // even if an older localStorage marker survived an uninstall.
      setInstalled(false);
    }

    function handleInstalled() {
      markInstallCompleted();
      trackPwaEvent("pwa_appinstalled", {
        platform: detectInstallPlatform(window.navigator.userAgent),
      });
      setPromptEvent(null);
      setInstalled(true);
    }

    /* eslint-disable react-hooks/set-state-in-effect -- browser-only install capability after hydration */
    setPlatform(detectInstallPlatform(window.navigator.userAgent));
    syncInstalledState();
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", syncInstalledState);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!promptEvent) return "unavailable";

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === "accepted") {
        markInstallCompleted();
        setInstalled(true);
      }
      return choice.outcome;
    } catch {
      setPromptEvent(null);
      return "unavailable";
    }
  }, [promptEvent]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      ready,
      installed,
      canNativeInstall: promptEvent !== null,
      platform,
      promptInstall,
    }),
    [installed, platform, promptEvent, promptInstall, ready],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used inside PwaInstallProvider.");
  }
  return context;
}
