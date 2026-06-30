import Link from "next/link";

import {
  DEFAULT_GLOBAL_RANKING_STEP,
  globalRankingHref,
} from "@/lib/global-ranking";
import {
  GLOBAL_ELITE_RANKING_LABEL,
  INSTITUTE_RANKING_LABEL,
} from "@/lib/ranking";
import { cn } from "@/lib/utils";

interface RankingTabsProps {
  active: "institute" | "global";
}

/** Switch between the main institute board and the bonus global elite board. */
export function RankingTabs({ active }: RankingTabsProps) {
  const tabs = [
    {
      id: "institute" as const,
      label: INSTITUTE_RANKING_LABEL,
      hint: "Main board",
      href: "/student/ranking",
    },
    {
      id: "global" as const,
      label: GLOBAL_ELITE_RANKING_LABEL,
      hint: "Bonus board",
      href: globalRankingHref(DEFAULT_GLOBAL_RANKING_STEP),
    },
  ];

  return (
    <div className="mb-6 space-y-2">
      <nav
        className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
        aria-label="Ranking scope"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col rounded-md px-4 py-2 text-center transition-colors",
              active === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <span className="text-sm font-medium">{tab.label}</span>
            <span className="text-[11px] text-muted-foreground">{tab.hint}</span>
          </Link>
        ))}
      </nav>
      <p className="text-xs text-muted-foreground">
        {active === "institute"
          ? "Your everyday institute leaderboard — all standard practice sessions count."
          : "Optional elite board with stricter cross-institute rules. Institute ranking stays your main progress view."}
      </p>
    </div>
  );
}
