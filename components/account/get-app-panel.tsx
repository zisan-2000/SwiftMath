"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Smartphone } from "lucide-react";

import {
  detectInstallPlatform,
  isStandaloneDisplay,
  readInstallState,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";

interface GetAppPanelProps {
  appName: string;
}

/** Account shortcut to reopen install instructions (students). */
export function GetAppPanel({ appName }: GetAppPanelProps) {
  const [standalone, setStandalone] = useState(false);
  const [platform, setPlatform] = useState("unknown");
  const [installedPreviously, setInstalledPreviously] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only install context after mount */
    setStandalone(isStandaloneDisplay());
    setPlatform(detectInstallPlatform(window.navigator.userAgent));
    setInstalledPreviously(readInstallState().installedAt !== null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-foreground">Get the app on your phone</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add {appName} to your home screen for one-tap practice and exam
          reminders.
        </p>
        {standalone ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            You are using the installed app.
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" aria-hidden />
            {installedPreviously
              ? "Reopen the guide if you still need help adding the app."
              : `Current device: ${platform.replace("-", " ")}`}
          </p>
        )}
      </div>
      {!standalone ? (
        <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/student/help/install">How to install</Link>
        </Button>
      ) : null}
    </div>
  );
}
