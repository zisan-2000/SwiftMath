"use client";

import { useState } from "react";
import { BellRing, Volume2, VolumeX } from "lucide-react";

import {
  playNotificationChime,
  readNotificationSoundEnabled,
  writeNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function NotificationSoundPanel() {
  const [enabled, setEnabled] = useState(() => readNotificationSoundEnabled());

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    writeNotificationSoundEnabled(next);
  }

  async function handlePreview() {
    await playNotificationChime();
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="font-medium text-foreground">Notification sound</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Play a short chime when an important alert arrives while this tab is
          open. No continuous ringing.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={!enabled}
          aria-label="Preview notification sound"
        >
          <BellRing className="h-4 w-4" />
          Preview
        </Button>
        <Button
          type="button"
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          aria-pressed={enabled}
          aria-label={
            enabled
              ? "Mute notification sound for this browser"
              : "Enable notification sound for this browser"
          }
        >
          {enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          {enabled ? "On" : "Muted"}
        </Button>
      </div>
    </div>
  );
}
