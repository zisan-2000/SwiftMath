"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { setInstituteActiveAction } from "@/app/super/institutes/actions";
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
 * Enable/disable toggle for an institute. Disabling locks out every member of
 * that institute, so this is a heavier action than the per-user toggle — the
 * toast spells out the effect.
 */
export function InstituteActiveToggle({
  instituteId,
  isActive,
}: {
  instituteId: string;
  isActive: boolean;
}) {
  return (
    <form
      action={async (formData) => {
        await setInstituteActiveAction(instituteId, !isActive, formData);
        toast.success(
          isActive ? "Institute disabled" : "Institute enabled",
        );
      }}
    >
      <ToggleButton isActive={isActive} />
    </form>
  );
}
