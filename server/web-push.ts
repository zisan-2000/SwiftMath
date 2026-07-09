import "server-only";

import webPush from "web-push";

import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/constants";

interface PushPayload {
  title: string;
  body: string;
  href: string;
  tag?: string;
}

interface WebPushError {
  statusCode?: number;
}

let configured = false;

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

function configureWebPush(): boolean {
  if (configured) {
    return true;
  }

  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    return false;
  }

  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    `mailto:${process.env.SUPPORT_EMAIL?.trim() || "support@example.com"}`;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function isGone(error: unknown): boolean {
  const statusCode = (error as WebPushError | null)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configureWebPush()) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, disabledAt: null },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    return;
  }

  const body = JSON.stringify({
    title: payload.title || APP_NAME,
    body: payload.body,
    href: payload.href,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: payload.tag,
    renotify: true,
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
        );
      } catch (error) {
        if (isGone(error)) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { disabledAt: new Date(), lastFailedAt: new Date() },
          });
          return;
        }
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastFailedAt: new Date() },
        });
        console.error("[web-push] delivery failed", error);
      }
    }),
  );
}
