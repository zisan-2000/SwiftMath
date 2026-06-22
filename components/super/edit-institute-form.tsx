"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  updateInstituteAction,
  type UpdateInstituteState,
} from "@/app/super/institutes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

export interface EditableInstitute {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
}

/**
 * Form for a Super Admin to edit an institute's identity + white-label
 * branding. Pre-filled with the current values; the action is bound to this
 * institute's id by the dialog.
 */
export function EditInstituteForm({
  institute,
  onSuccess,
}: {
  institute: EditableInstitute;
  onSuccess?: () => void;
}) {
  const action = updateInstituteAction.bind(null, institute.id);
  const [state, formAction, pending] = useActionState<
    UpdateInstituteState,
    FormData
  >(action, {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Institute updated");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-institute-name">Name</Label>
          <Input
            id="edit-institute-name"
            name="name"
            defaultValue={institute.name}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-institute-slug">Slug</Label>
          <Input
            id="edit-institute-slug"
            name="slug"
            defaultValue={institute.slug}
            pattern="[a-z0-9\-]+"
            autoComplete="off"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-institute-tagline">
          Tagline{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="edit-institute-tagline"
          name="tagline"
          defaultValue={institute.tagline ?? ""}
          placeholder="Mental-math mastery for every student"
          maxLength={120}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-institute-logo">
          Logo URL{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="edit-institute-logo"
          name="logoUrl"
          type="url"
          defaultValue={institute.logoUrl ?? ""}
          placeholder="https://example.com/logo.png"
          autoComplete="off"
        />
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
