import { NotificationType } from "@/lib/generated/prisma/enums";

export const NOTIFICATION_SOUND_ENABLED_STORAGE_KEY =
  "swiftmath.notificationSoundEnabled";

export const DEFAULT_NOTIFICATION_SOUND_ENABLED = true;

export function isSoundAlertNotificationType(type: NotificationType): boolean {
  return (
    type === NotificationType.EXAM_OPEN ||
    type === NotificationType.EXAM_CLOSING_SOON ||
    type === NotificationType.LEVEL_UP
  );
}

export function readNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_SOUND_ENABLED;
  }

  const stored = window.localStorage.getItem(
    NOTIFICATION_SOUND_ENABLED_STORAGE_KEY,
  );
  if (stored == null) {
    return DEFAULT_NOTIFICATION_SOUND_ENABLED;
  }

  return stored !== "false";
}

export function writeNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    NOTIFICATION_SOUND_ENABLED_STORAGE_KEY,
    String(enabled),
  );
}

export async function playNotificationChime(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!readNotificationSoundEnabled()) return;

  const AudioContextCtor =
    window.AudioContext ||
    // @ts-expect-error Safari legacy prefix.
    window.webkitAudioContext;

  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const gain = context.createGain();
    gain.gain.value = 0.0001;
    gain.connect(context.destination);

    const start = context.currentTime;
    const notes = [
      { at: 0, freq: 880, duration: 0.08 },
      { at: 0.11, freq: 1174, duration: 0.12 },
    ];

    for (const note of notes) {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      osc.connect(gain);
      osc.start(start + note.at);
      osc.stop(start + note.at + note.duration);
    }

    gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.04, start + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

    window.setTimeout(() => {
      void context.close().catch(() => {});
    }, 450);
  } catch {
    void context.close().catch(() => {});
  }
}
