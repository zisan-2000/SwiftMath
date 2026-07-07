"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  setInstituteAdminActiveAction,
  type SetInstituteAdminActiveState,
} from "@/app/super/institutes/[instituteId]/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
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

export function AdminActiveToggle({
  instituteId,
  userId,
  isActive,
}: {
  instituteId: string;
  userId: string;
  isActive: boolean;
}) {
  const [state, formAction] = useActionState<
    SetInstituteAdminActiveState,
    FormData
  >(
    setInstituteAdminActiveAction.bind(null, instituteId, userId, !isActive),
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(isActive ? "Admin disabled" : "Admin enabled");
    }
  }, [state, isActive]);

  return (
    <form action={formAction} className="space-y-2">
      <ToggleButton isActive={isActive} />
      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}
    </form>
  );
}
