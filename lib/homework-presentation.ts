import type { Role } from "@/lib/generated/prisma/enums";

export function buildHomeworkPageSuggestions(pages: string[]): string[] {
  const unique = new Map<string, string>();
  for (const page of pages) {
    const trimmed = page.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }),
  );
}

export function elapsedSecondsSince(startedAt: string | Date, now = new Date()): number {
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((now.getTime() - startedMs) / 1000));
}

export function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const parts = [minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")];
  return hours > 0 ? `${hours.toString().padStart(2, "0")}:${parts.join(":")}` : parts.join(":");
}

export function canAccessHomeworkPhoto(input: {
  role: Role;
  userId: string;
  studentId: string;
  scheduleCreatorId: string;
}): boolean {
  if (input.role === "ADMIN") return true;
  if (input.role === "STUDENT") return input.userId === input.studentId;
  if (input.role === "TEACHER") return input.userId === input.scheduleCreatorId;
  return false;
}
