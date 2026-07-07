import Link from "next/link";
import { Flame, Play, Sparkles, Target } from "lucide-react";

import { startSessionAction } from "@/app/student/practice/actions";
import { Button } from "@/components/ui/button";

interface StudentHomeHeroProps {
  /** Student's display name for the greeting. */
  studentName: string;
  /** Current level name, or null when none is assigned yet. */
  levelName: string | null;
  /** Current practice streak in days (0 when none). */
  streakDays: number;
}

/**
 * The primary call-to-action on the student home. When a level is assigned it
 * offers a single obvious "Start practice" action (plus an untimed review);
 * otherwise it explains that a teacher must assign a level first.
 */
export function StudentHomeHero({
  studentName,
  levelName,
  streakDays,
}: StudentHomeHeroProps) {
  const firstName = studentName.split(" ")[0] || studentName;

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {streakDays > 0
              ? `${streakDays}-day streak — keep it alive!`
              : "Ready when you are"}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {levelName ? `Let's practice, ${firstName}` : `Hello, ${firstName}`}
          </h2>
          {levelName ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-4 w-4" aria-hidden="true" />
                Current level:{" "}
                <span className="font-semibold text-foreground">{levelName}</span>
              </span>
              {streakDays > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
                  {streakDays} {streakDays === 1 ? "day" : "days"} in a row
                </span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Your teacher hasn&apos;t assigned a level yet. Check back soon — your
              practice will appear here.
            </p>
          )}
        </div>

        {levelName && (
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <form action={startSessionAction}>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                <Play className="h-4 w-4" aria-hidden="true" />
                Start practice
              </Button>
            </form>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground sm:w-auto"
            >
              <Link href="/student/practice">More practice options</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
