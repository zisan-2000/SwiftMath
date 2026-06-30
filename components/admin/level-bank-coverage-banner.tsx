import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

import { assessLevelBankCoverage } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

/** Admin banner when the bank is empty, partial, or blocking bank-only mode. */
export function LevelBankCoverageBanner({
  sessionQuestionCount,
  totalBankCount,
  activeBankCount,
  bankOnly = false,
  className,
}: {
  sessionQuestionCount: number;
  totalBankCount: number;
  activeBankCount: number;
  bankOnly?: boolean;
  className?: string;
}) {
  const coverage = assessLevelBankCoverage({
    sessionQuestionCount,
    totalBankCount,
    activeBankCount,
    bankOnly,
  });

  const Icon =
    coverage.status === "ok"
      ? CheckCircle2
      : coverage.status === "blocked"
        ? ShieldAlert
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
        coverage.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-foreground",
        coverage.status === "empty" &&
          "border-border bg-muted/40 text-foreground",
        className,
      )}
      role={
        coverage.status === "partial" || coverage.status === "blocked"
          ? "alert"
          : undefined
      }
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          coverage.status === "ok" && "text-success",
          coverage.status === "partial" && "text-warning",
          coverage.status === "blocked" && "text-destructive",
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
