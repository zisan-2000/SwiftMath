import Link from "next/link";

import { cn } from "@/lib/utils";

interface RankingTabsProps {
  active: "institute" | "global";
}

/** Switch between institute-scoped and platform-wide student rankings. */
export function RankingTabs({ active }: RankingTabsProps) {
  const tabs = [
    { id: "institute" as const, label: "Institute", href: "/student/ranking" },
    { id: "global" as const, label: "Global", href: "/student/ranking/global" },
  ];

  return (
    <nav
      className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
      aria-label="Ranking scope"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
