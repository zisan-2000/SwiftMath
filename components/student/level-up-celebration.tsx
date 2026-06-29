"use client";

import { PartyPopper, Sparkles } from "lucide-react";

/** Celebratory banner shown when a timed pass triggers a level-up. */
export function LevelUpCelebration({
  nextLevelName,
}: {
  /** The student's new current level after level-up (optional). */
  nextLevelName?: string | null;
}) {
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-background px-6 py-8 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      >
        <Sparkles className="absolute left-6 top-6 h-5 w-5 text-primary/70" />
        <Sparkles className="absolute right-8 top-10 h-4 w-4 text-primary/60" />
        <Sparkles className="absolute bottom-6 left-1/3 h-4 w-4 text-primary/50" />
      </div>

      <PartyPopper
        className="relative mx-auto h-12 w-12 text-primary"
        aria-hidden="true"
      />
      <h2 className="relative mt-4 text-2xl font-bold tracking-tight text-foreground">
        Level up!
      </h2>
      <p className="relative mt-2 text-sm text-muted-foreground">
        You passed and unlocked the next stage. Great work!
      </p>
      {nextLevelName && (
        <p className="relative mt-3 text-lg font-semibold text-primary">
          Now on: {nextLevelName}
        </p>
      )}
    </div>
  );
}
