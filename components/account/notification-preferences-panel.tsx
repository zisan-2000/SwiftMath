"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setNotificationPreferenceAction } from "@/app/account/actions";
import type { NotificationPreferenceView } from "@/lib/notifications";
import { Label } from "@/components/ui/label";

/** Per-type in-app notification toggles on the account page (N7). */
export function NotificationPreferencesPanel({
  preferences: initialPreferences,
}: {
  preferences: NotificationPreferenceView[];
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (initialPreferences.length === 0) {
    return null;
  }

  function handleToggle(type: NotificationPreferenceView["type"], enabled: boolean) {
    setPendingType(type);
    startTransition(async () => {
      const result = await setNotificationPreferenceAction(type, enabled);
      setPendingType(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPreferences((current) =>
        current.map((row) =>
          row.type === type ? { ...row, enabled } : row,
        ),
      );
      toast.success(enabled ? "Notifications enabled" : "Notifications muted");
    });
  }

  return (
    <ul className="divide-y divide-border">
      {preferences.map((row) => {
        const inputId = `notification-pref-${row.type}`;
        const pending = pendingType === row.type;

        return (
          <li
            key={row.type}
            className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <Label htmlFor={inputId} className="font-medium text-foreground">
                {row.label}
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.description}
              </p>
            </div>
            <input
              id={inputId}
              type="checkbox"
              checked={row.enabled}
              disabled={pending}
              onChange={(event) => handleToggle(row.type, event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-input"
              aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.label}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
