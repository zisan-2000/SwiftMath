"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";

import { trackPwaEvent } from "@/lib/pwa-analytics";
import {
  SERVICE_WORKER_PATH,
  dismissPushFollowup,
  isStandaloneDisplay,
  markPushFollowupCompleted,
  readInstallState,
  shouldShowPushFollowup,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

async function hasActivePushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const registration =
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register(SERVICE_WORKER_PATH));
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

/** Step 2 after install — guide students to enable browser push from Account. */
export function InstallPushFollowup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isStandaloneDisplay()) {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    void (async () => {
      const state = readInstallState();
      if (!shouldShowPushFollowup(state)) {
        return;
      }

      const subscribed = await hasActivePushSubscription();
      if (cancelled) {
        return;
      }

      if (subscribed) {
        markPushFollowupCompleted();
        return;
      }

      timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        trackPwaEvent("pwa_push_followup_shown", {
          standalone: true,
        });
        setOpen(true);
      }, 2000);
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  function handleLater() {
    dismissPushFollowup();
    trackPwaEvent("pwa_push_followup_dismissed");
    setOpen(false);
  }

  function handleEnableClick() {
    trackPwaEvent("pwa_push_followup_clicked");
    markPushFollowupCompleted();
    setOpen(false);
  }

  if (!isStandaloneDisplay()) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 motion-reduce:transition-none sm:px-6"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">Step 2: Exam reminders চালু করুন</SheetTitle>
          <SheetDescription>
            You installed the app — now turn on push notifications so exam alerts
            reach you even when the app is closed.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            Account settings-এ গিয়ে <strong className="text-foreground">Browser push</strong>{" "}
            On করুন। iPhone-এ notifications শুধু installed app থেকেই কাজ করে।
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Exam open হলে reminder পাবেন</li>
            <li>In-app inbox-ও আগের মতো থাকবে</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleLater}>
            Later
          </Button>
          <Button asChild onClick={handleEnableClick}>
            <Link href="/account#browser-push">
              <BellRing className="h-4 w-4" />
              Enable notifications
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
