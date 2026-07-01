"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/notifications";
import { notificationsPageHref } from "@/lib/notifications";

/** Mark one notification read for the signed-in user. */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const user = await requireUser();
  await markNotificationRead(user.id, user.instituteId, notificationId);

  const inboxHref = notificationsPageHref(user.role);
  if (inboxHref) {
    revalidatePath(inboxHref);
  }
}

/** Mark every unread notification read for the signed-in user. */
export async function markAllNotificationsReadAction(): Promise<number> {
  const user = await requireUser();
  const count = await markAllNotificationsRead(user.id, user.instituteId);

  const inboxHref = notificationsPageHref(user.role);
  if (inboxHref) {
    revalidatePath(inboxHref);
  }

  return count;
}
