import { CheckCircle2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Inline success/error feedback for forms. Token-based so it works in both
 * themes. `size="sm"` is used inside compact controls (e.g. reset-password).
 */
export function FormMessage({
  variant,
  children,
  size = "default",
  className,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
  size?: "default" | "sm";
  className?: string;
}) {
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;
  return (
    <p
      role={variant === "error" ? "alert" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-3 py-2",
        size === "sm" ? "text-xs" : "text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span>{children}</span>
    </p>
  );
}
