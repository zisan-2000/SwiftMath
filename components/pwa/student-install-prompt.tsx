"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { trackPwaEvent } from "@/lib/pwa-analytics";
import {
  notifyInstallPromptClose,
  notifyInstallPromptOpen,
} from "@/lib/pwa-ui-coordination";
import {
  detectInstallPlatform,
  isStandaloneDisplay,
  markInstallCompleted,
  permanentlyDismissInstallPrompt,
  readInstallState,
  recordInstallPromptShown,
  recordStudentVisit,
  shouldAutoShowInstallPrompt,
  snoozeInstallPrompt,
} from "@/lib/pwa";
import { InstallGuideContent } from "@/components/pwa/install-guide-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface StudentInstallPromptProps {
  appName: string;
}

export function StudentInstallPrompt({ appName }: StudentInstallPromptProps) {
  const searchParams = useSearchParams();
  const forceOpen = searchParams.get("install") === "1";

  const [open, setOpen] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState(() =>
    typeof window !== "undefined"
      ? detectInstallPlatform(window.navigator.userAgent)
      : "unknown",
  );

  const eligiblePlatform = useMemo(
    () =>
      platform === "android" ||
      platform === "ios-safari" ||
      platform === "ios-non-safari" ||
      platform === "ios-in-app" ||
      platform === "unknown",
    [platform],
  );

  const evaluatePrompt = useCallback(() => {
    if (isStandaloneDisplay()) {
      return false;
    }

    const state = recordStudentVisit();
    return shouldAutoShowInstallPrompt(state, { force: forceOpen });
  }, [forceOpen]);

  useEffect(() => {
    if (open) {
      notifyInstallPromptOpen();
      return () => notifyInstallPromptClose();
    }

    notifyInstallPromptClose();
    return undefined;
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- client-only platform + install events after mount */
    setPlatform(detectInstallPlatform(window.navigator.userAgent));
    /* eslint-enable react-hooks/set-state-in-effect */

    if (isStandaloneDisplay()) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      markInstallCompleted();
      trackPwaEvent("pwa_appinstalled", { platform });
      setPromptEvent(null);
      setOpen(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [platform]);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    if (!eligiblePlatform && !forceOpen) {
      return;
    }

    if (!evaluatePrompt()) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!shouldAutoShowInstallPrompt(readInstallState(), { force: forceOpen })) {
        return;
      }

      recordInstallPromptShown();
      trackPwaEvent("pwa_prompt_shown", {
        platform,
        forced: forceOpen,
      });
      setOpen(true);
    }, forceOpen ? 0 : 1500);

    return () => window.clearTimeout(timer);
  }, [eligiblePlatform, evaluatePrompt, forceOpen, platform]);

  async function install() {
    if (!promptEvent) {
      return;
    }

    trackPwaEvent("pwa_install_clicked", { platform });

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      markInstallCompleted();
      trackPwaEvent("pwa_install_accepted", { platform });
      setOpen(false);
    } else {
      trackPwaEvent("pwa_install_declined", { platform });
    }
    setPromptEvent(null);
  }

  function handleNotNow() {
    snoozeInstallPrompt();
    trackPwaEvent("pwa_prompt_snoozed", { platform });
    setOpen(false);
  }

  function handleDontShowAgain() {
    permanentlyDismissInstallPrompt();
    trackPwaEvent("pwa_prompt_dismissed_permanent", { platform });
    setOpen(false);
  }

  if (isStandaloneDisplay()) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 motion-reduce:transition-none sm:px-6"
        aria-describedby="student-install-description"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">ফোনে {appName} রাখুন</SheetTitle>
          <SheetDescription id="student-install-description">
            Add the app to your home screen for faster practice and exam reminders.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <InstallGuideContent
            appName={appName}
            platform={platform}
            variant="sheet"
            canNativeInstall={Boolean(promptEvent)}
            onInstall={install}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleNotNow}>
            Not now
          </Button>
          <Button variant="ghost" onClick={handleDontShowAgain}>
            Don&apos;t show again
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
