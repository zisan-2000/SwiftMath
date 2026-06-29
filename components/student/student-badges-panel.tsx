import {
  Award,
  Flame,
  Medal,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { StudentBadge } from "@/lib/student-gamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BADGE_ICONS: Record<StudentBadge["id"], LucideIcon> = {
  "first-pass": Medal,
  "level-up": Trophy,
  "perfect-score": Star,
  "hot-streak": Flame,
  "weekly-warrior": Award,
};

/** Earned and locked achievement badges for the student home. */
export function StudentBadgesPanel({ badges }: { badges: StudentBadge[] }) {
  const earned = badges.filter((badge) => badge.earned);

  return (
    <Card className="mt-8">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Your badges
          <Badge variant="secondary">{earned.length} earned</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.id];
            return (
              <li
                key={badge.id}
                className={cn(
                  "flex items-start gap-3 px-5 py-4",
                  !badge.earned && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    badge.earned
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{badge.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {badge.description}
                  </p>
                  {!badge.earned && (
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      Locked
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
