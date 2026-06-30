import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { assessLevelBankCoverage } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

/** Admin banner when the bank is empty or smaller than the level session size. */
export function LevelBankCoverageBanner({
  sessionQuestionCount,
  totalBankCount,
  activeBankCount,
  className,
}: {
  sessionQuestionCount: number;
  totalBankCount: number;
  activeBankCount: number;
  className?: string;
}) {
  const coverage = assessLevelBankCoverage({
    sessionQuestionCount,
    totalBankCount,
    activeBankCount,
  });

  const Icon =
    coverage.status === "ok"
      ? CheckCircle2
      : coverage.status === "partial"
        ? AlertTriangle
        : Info;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm",
        coverage.status === "ok" &&
          "border-success/30 bg-success/10 text-foreground",
        coverage.status === "partial" &&
          "border-warning/30 bg-warning/10 text-foreground",
        coverage.status === "empty" &&
          "border-border bg-muted/40 text-foreground",
        className,
      )}
      role={coverage.status === "partial" ? "alert" : undefined}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          coverage.status === "ok" && "text-success",
          coverage.status === "partial" && "text-warning",
          coverage.status === "empty" && "text-muted-foreground",
        )}
        aria-hidden
      />
      <div>
        <p className="font-medium">{coverage.headline}</p>
        <p className="mt-1 text-muted-foreground">{coverage.detail}</p>
      </div>
    </div>
  );
}
