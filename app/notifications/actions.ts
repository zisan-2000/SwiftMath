"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/notifications";
import { notificationsPageHref } from "@/lib/notifications";

function revalidateNotificationChrome(role: Role): void {
  const inboxHref = notificationsPageHref(role);
  if (inboxHref) {
    revalidatePath(inboxHref);
  }

  switch (role) {
    case Role.STUDENT:
      revalidatePath("/student");
      break;
    case Role.TEACHER:
      revalidatePath("/teacher");
      break;
    case Role.ADMIN:
      revalidatePath("/admin");
      break;
    default:
      break;
  }
}

/** Mark one notification read for the signed-in user. */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const user = await requireUser();
  await markNotificationRead(user.id, user.instituteId, notificationId);
  revalidateNotificationChrome(user.role);
}

/** Mark every unread notification read for the signed-in user. */
export async function markAllNotificationsReadAction(): Promise<number> {
  const user = await requireUser();
  const count = await markAllNotificationsRead(user.id, user.instituteId);
  revalidateNotificationChrome(user.role);
  return count;
}
