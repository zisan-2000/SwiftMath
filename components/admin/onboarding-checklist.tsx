import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import type { AdminOnboardingStep } from "@/lib/admin-onboarding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Getting-started checklist for a new institute admin. Shown on the admin
 * dashboard until every setup step is complete, then hidden.
 */
export function AdminOnboardingChecklist({
  steps,
}: {
  steps: AdminOnboardingStep[];
}) {
  const completed = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="border-b border-border/80">
        <CardTitle className="text-base">Getting started</CardTitle>
        <CardDescription>
          {completed} of {steps.length} steps complete — follow these in order
          to get your institute ready for student practice.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ol className="divide-y divide-border">
          {steps.map((step, index) => {
            const Icon = step.done ? CheckCircle2 : Circle;
            const content = (
              <>
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    step.done
                      ? "text-success"
                      : "text-muted-foreground/60",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-medium",
                      step.done
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {index + 1}. {step.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </>
            );

            return (
              <li key={step.id}>
                {step.done ? (
                  <div className="flex gap-3 px-5 py-4">{content}</div>
                ) : (
                  <Link
                    href={step.href}
                    className="flex gap-3 px-5 py-4 transition-colors hover:bg-accent/50"
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
