"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { trackPwaEvent } from "@/lib/pwa-analytics";
import {
  notifyInstallPromptClose,
  notifyInstallPromptOpen,
} from "@/lib/pwa-ui-coordination";
import { cn } from "@/lib/utils";
import { InstallGuideContent } from "@/components/pwa/install-guide-content";
import { usePwaInstall } from "@/components/pwa/pwa-install-provider";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface InstallAppButtonProps {
  appName: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/** Visible install entry point with native prompt and device-guide fallback. */
export function InstallAppButton({
  appName,
  className,
  variant = "outline",
  size = "default",
}: InstallAppButtonProps) {
  const {
    ready,
    installed,
    canNativeInstall,
    platform,
    promptInstall,
  } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!guideOpen) {
      notifyInstallPromptClose();
      return;
    }
    notifyInstallPromptOpen();
    return () => notifyInstallPromptClose();
  }, [guideOpen]);

  async function handleClick() {
    trackPwaEvent("pwa_install_clicked", {
      platform,
      source: "install_button",
      native: canNativeInstall,
    });

    if (canNativeInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        trackPwaEvent("pwa_install_accepted", { platform });
        return;
      }
      if (outcome === "dismissed") {
        trackPwaEvent("pwa_install_declined", { platform });
        return;
      }
    }

    trackPwaEvent("pwa_help_opened", {
      platform,
      source: "install_button",
    });
    setGuideOpen(true);
  }

  if (!ready || installed) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("shrink-0", className)}
        onClick={handleClick}
      >
        <Download aria-hidden />
        Install App
      </Button>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent
          side="bottom"
          className="z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 motion-reduce:transition-none sm:px-6"
          aria-describedby="install-app-guide-description"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg">Install {appName}</SheetTitle>
            <SheetDescription id="install-app-guide-description">
              Follow the instructions for this device and browser.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <InstallGuideContent
              appName={appName}
              platform={platform}
              variant="sheet"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
