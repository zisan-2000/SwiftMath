"use client";

import { useEffect, useState } from "react";

import { trackPwaEvent } from "@/lib/pwa-analytics";
import { detectInstallPlatform } from "@/lib/pwa";
import { InstallGuideContent } from "@/components/pwa/install-guide-content";

interface InstallGuidePageProps {
  appName: string;
}

export function InstallGuidePage({ appName }: InstallGuidePageProps) {
  const [platform, setPlatform] = useState<ReturnType<typeof detectInstallPlatform>>(
    "unknown",
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only platform detection after mount */
    setPlatform(detectInstallPlatform(window.navigator.userAgent));
    /* eslint-enable react-hooks/set-state-in-effect */
    trackPwaEvent("pwa_help_opened", {
      platform: detectInstallPlatform(window.navigator.userAgent),
    });
  }, []);

  return (
    <InstallGuideContent
      appName={appName}
      platform={platform}
      variant="page"
      showActions
    />
  );
}
