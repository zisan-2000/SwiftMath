"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { setUserActiveAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ToggleButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={isActive ? "outline" : "secondary"}
      disabled={pending}
      className={cn(
        isActive
          ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          : "border-success/30 text-success hover:bg-success/10",
      )}
    >
      {isActive ? "Disable" : "Enable"}
    </Button>
  );
}

/**
 * Enable/disable toggle for a teacher or student. Wraps the server action to
 * pop a toast once it resolves (the row stays put and just flips state).
 */
export function ActiveToggle({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  return (
    <form
      action={async (formData) => {
        await setUserActiveAction(userId, !isActive, formData);
        toast.success(isActive ? "Account disabled" : "Account enabled");
      }}
    >
      <ToggleButton isActive={isActive} />
    </form>
  );
}
