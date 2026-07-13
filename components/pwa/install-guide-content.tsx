"use client";

import Link from "next/link";
import { Download, ExternalLink, MoreVertical, Smartphone } from "lucide-react";

import type { PwaInstallPlatform } from "@/lib/pwa";
import { InstallBenefits } from "@/components/pwa/install-benefits";
import { IosInstallSteps } from "@/components/pwa/ios-install-steps";
import { Button } from "@/components/ui/button";

interface InstallGuideContentProps {
  appName: string;
  platform: PwaInstallPlatform;
  variant?: "sheet" | "page";
  canNativeInstall?: boolean;
  onInstall?: () => void;
  showActions?: boolean;
}

function PlatformInstructions({
  platform,
  canNativeInstall,
  onInstall,
}: Pick<InstallGuideContentProps, "platform" | "canNativeInstall" | "onInstall">) {
  if (platform === "ios-safari") {
    return <IosInstallSteps />;
  }

  if (platform === "ios-in-app" || platform === "ios-non-safari") {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
        <p className="font-medium">Safari-তে খুলুন</p>
        <p className="mt-1 text-muted-foreground">
          iPhone-এ install করতে এই পেজ Safari browser-এ খুলতে হবে। WhatsApp বা
          Chrome-এর ভেতরের browser থেকে home screen add করা যায় না।
        </p>
        <p className="mt-2 text-muted-foreground">
          Open this page in Safari, then follow the Add to Home Screen steps.
        </p>
      </div>
    );
  }

  if (platform === "android" && canNativeInstall && onInstall) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Tap the button below, then confirm “Install” when your browser asks.
        </p>
        <Button className="mt-3" onClick={onInstall}>
          <Download className="h-4 w-4" />
          Add to Home Screen
        </Button>
      </div>
    );
  }

  if (platform === "android") {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <MoreVertical className="h-4 w-4" aria-hidden />
          Browser menu থেকে install করুন
        </p>
        <p className="mt-2 text-muted-foreground">
          Chrome-এর উপরে ডানে menu (⋮) → “Install app” বা “Add to Home screen”
          বেছে নিন।
        </p>
      </div>
    );
  }

  if (platform === "desktop") {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Smartphone className="h-4 w-4" aria-hidden />
          Phone-এ install করুন
        </p>
        <p className="mt-2">
          Daily practice-এর জন্য phone বা tablet-এ এই site খুলে home screen-এ
          যোগ করুন। Desktop-এ browser address bar থেকেও install option পাওয়া
          যেতে পারে।
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
      Use your browser menu to add this site to your home screen.
    </div>
  );
}

/** Shared install copy for the student prompt sheet and help page. */
export function InstallGuideContent({
  appName,
  platform,
  variant = "sheet",
  canNativeInstall = false,
  onInstall,
  showActions = false,
}: InstallGuideContentProps) {
  const isPage = variant === "page";

  return (
    <div className={isPage ? "space-y-6" : "space-y-4"}>
      {isPage ? (
        <div>
          <p className="text-sm font-medium text-primary">Recommended for students</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            ফোনে {appName} রাখুন
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add {appName} to your phone like an app — faster practice, fewer missed
            exams.
          </p>
        </div>
      ) : null}

      <InstallBenefits />

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How to install
        </h3>
        <PlatformInstructions
          platform={platform}
          canNativeInstall={canNativeInstall}
          onInstall={onInstall}
        />
      </div>

      {showActions ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/account">
              <ExternalLink className="h-4 w-4" />
              Account settings
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
