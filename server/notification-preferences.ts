// Trusted reads/writes for per-user notification delivery preferences (N7).

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  formatNotificationTypeLabel,
  isConfigurableNotificationType,
  notificationPreferenceDescription,
  notificationPreferenceTypes,
  type NotificationPreferenceView,
} from "@/lib/notifications";
import { NotificationType, Role } from "@/lib/generated/prisma/enums";

export type { NotificationPreferenceView };

/** List preference toggles for the signed-in user's role (default enabled). */
export async function listNotificationPreferencesForUser(input: {
  userId: string;
  instituteId: string;
  role: Role;
}): Promise<NotificationPreferenceView[]> {
  const types = notificationPreferenceTypes(input.role);
  if (types.length === 0) return [];

  const stored = await prisma.notificationPreference.findMany({
    where: { userId: input.userId, type: { in: types } },
    select: { type: true, enabled: true },
  });
  const enabledByType = new Map(
    stored.map((row) => [row.type, row.enabled] as const),
  );

  return types.map((type) => ({
    type,
    enabled: enabledByType.get(type) ?? true,
    label: formatNotificationTypeLabel(type),
    description: notificationPreferenceDescription(type),
  }));
}

/** Update one notification type preference for the signed-in user. */
export async function setUserNotificationPreference(input: {
  userId: string;
  instituteId: string;
  role: Role;
  type: NotificationType;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isConfigurableNotificationType(input.role, input.type)) {
    return { ok: false, error: "That notification type is not available." };
  }

  if (input.enabled) {
    await prisma.notificationPreference.deleteMany({
      where: { userId: input.userId, type: input.type },
    });
    return { ok: true };
  }

  await prisma.notificationPreference.upsert({
    where: {
      userId_type: { userId: input.userId, type: input.type },
    },
    create: {
      userId: input.userId,
      instituteId: input.instituteId,
      type: input.type,
      enabled: false,
    },
    update: {
      enabled: false,
      instituteId: input.instituteId,
    },
  });

  return { ok: true };
}

/** Load disabled types for specific users (batch notify helpers). */
export async function loadDisabledNotificationPreferencesForUsers(
  userIds: string[],
): Promise<Map<string, Set<NotificationType>>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, enabled: false },
    select: { userId: true, type: true },
  });

  const map = new Map<string, Set<NotificationType>>();
  for (const row of rows) {
    const set = map.get(row.userId) ?? new Set<NotificationType>();
    set.add(row.type);
    map.set(row.userId, set);
  }
  return map;
}

/** Load all disabled types keyed by user — used by cron batch delivery (N6 + N7). */
export async function loadDisabledNotificationPreferencesMap(): Promise<
  Map<string, Set<NotificationType>>
> {
  const rows = await prisma.notificationPreference.findMany({
    where: { enabled: false },
    select: { userId: true, type: true },
  });

  const map = new Map<string, Set<NotificationType>>();
  for (const row of rows) {
    const set = map.get(row.userId) ?? new Set<NotificationType>();
    set.add(row.type);
    map.set(row.userId, set);
  }
  return map;
}

/** Whether a new notification of this type should be created for the user. */
export async function isNotificationDeliveryEnabled(
  userId: string,
  type: NotificationType,
  disabledMap?: Map<string, Set<NotificationType>>,
): Promise<boolean> {
  if (disabledMap) {
    return !disabledMap.get(userId)?.has(type);
  }

  const row = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
    select: { enabled: true },
  });
  return row?.enabled ?? true;
}

export function isNotificationDeliveryEnabledSync(
  userId: string,
  type: NotificationType,
  disabledMap: Map<string, Set<NotificationType>>,
): boolean {
  return !disabledMap.get(userId)?.has(type);
}
