"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  createInstituteAdminAction,
  type CreateInstituteAdminState,
} from "@/app/super/institutes/[instituteId]/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function AddInstituteAdminForm({
  instituteId,
}: {
  instituteId: string;
}) {
  const [state, formAction, pending] = useActionState<
    CreateInstituteAdminState,
    FormData
  >(createInstituteAdminAction.bind(null, instituteId), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Admin created");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-admin-name">Full name</Label>
          <Input id="new-admin-name" name="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-admin-email">Email</Label>
          <Input
            id="new-admin-email"
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-admin-password">Temporary password</Label>
          <PasswordInput
            id="new-admin-password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create admin"}
        </Button>
      </div>
    </form>
  );
}
