"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";

import {
  SERVICE_WORKER_PATH,
  isIosPushInstallRequired,
  isStandaloneDisplay,
  urlBase64ToUint8Array,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PushState =
  | "checking"
  | "unsupported"
  | "not-configured"
  | "blocked"
  | "needs-install"
  | "off"
  | "on"
  | "working";

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

async function getBrowserSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
}

export function PushNotificationPanel() {
  const [state, setState] = useState<PushState>("checking");

  useEffect(() => {
    async function check() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }

      if (isIosPushInstallRequired(window.navigator.userAgent) && !isStandaloneDisplay()) {
        setState("needs-install");
        return;
      }

      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyPayload = (await keyResponse.json()) as {
        enabled?: boolean;
        publicKey?: string | null;
      };
      if (!keyPayload.enabled || !keyPayload.publicKey) {
        setState("not-configured");
        return;
      }

      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }

      const subscription = await getBrowserSubscription();
      setState(subscription ? "on" : "off");
    }

    check().catch((error) => {
      console.error("[push] status check failed", error);
      setState("off");
    });
  }, []);

  async function enable() {
    try {
      setState("working");
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("blocked");
        return;
      }
      if (permission !== "granted") {
        setState("off");
        return;
      }

      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
      if (!publicKey) {
        setState("not-configured");
        return;
      }

      const registration = await getRegistration();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error("Subscription save failed");
      }

      setState("on");
      toast.success("Push notifications enabled");
    } catch (error) {
      console.error("[push] enable failed", error);
      setState("off");
      toast.error("Push notifications could not be enabled");
    }
  }

  async function disable() {
    try {
      setState("working");
      const subscription = await getBrowserSubscription();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });
      await subscription?.unsubscribe();
      setState("off");
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("[push] disable failed", error);
      setState("on");
      toast.error("Push notifications could not be disabled");
    }
  }

  const isBusy = state === "checking" || state === "working";
  const enabled = state === "on";
  const unavailable =
    state === "unsupported" ||
    state === "not-configured" ||
    state === "blocked" ||
    state === "needs-install";

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="font-medium text-foreground">Browser push</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive exam reminders and important alerts even when the app is not open.
        </p>
        {state === "needs-install" ? (
          <div className="mt-2 space-y-2 text-sm">
            <p className="text-foreground">
              iPhone-এ push notification চালু করতে আগে app টি home screen-এ যোগ
              করুন।
            </p>
            <p className="text-muted-foreground">
              On iOS, install the app to your home screen first, then return here
              to enable push.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/student/help/install">How to install</Link>
            </Button>
          </div>
        ) : null}
        {state === "blocked" ? (
          <p className="mt-2 text-sm text-destructive">
            Browser notification permission is blocked for this site.
          </p>
        ) : null}
        {state === "not-configured" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            VAPID keys are not configured in this environment.
          </p>
        ) : null}
        {state === "unsupported" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This browser does not support Web Push.
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={enabled ? disable : enable}
        disabled={isBusy || unavailable}
        aria-pressed={enabled}
      >
        {enabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {enabled ? "On" : isBusy ? "Checking" : "Off"}
      </Button>
    </div>
  );
}
