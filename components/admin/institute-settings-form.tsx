"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  updateInstituteSettingsAction,
  type UpdateInstituteSettingsState,
} from "@/app/admin/settings/actions";
import type { InstituteBrandingSettings } from "@/lib/institute-branding";
import { PrimaryColorField } from "@/components/admin/primary-color-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/**
 * Institute Admin form to edit their tenant's white-label branding. Slug is
 * shown read-only — only Super Admin can change it.
 */
export function InstituteSettingsForm({
  institute,
}: {
  institute: InstituteBrandingSettings;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateInstituteSettingsState,
    FormData
  >(updateInstituteSettingsAction, {});

  useEffect(() => {
    if (state.ok) toast.success("Institute settings saved");
  }, [state.ok]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-institute-name">Institute name</Label>
        <Input
          id="settings-institute-name"
          name="name"
          defaultValue={institute.name}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-institute-slug">Slug</Label>
        <Input
          id="settings-institute-slug"
          value={institute.slug}
          readOnly
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          URL identifier — contact platform support to change.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-institute-tagline">
          Tagline{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="settings-institute-tagline"
          name="tagline"
          defaultValue={institute.tagline ?? ""}
          placeholder="Mental-math mastery for every student"
          maxLength={120}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Primary color</Label>
        <PrimaryColorField defaultValue={institute.primaryColor} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-4">
        <Label htmlFor="settings-institute-logo-file">Logo upload</Label>
        {institute.logoUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={institute.logoUrl}
              alt=""
              className="size-12 rounded-md border border-border bg-background object-contain"
            />
            <p className="text-xs text-muted-foreground">
              Current logo — upload a new file to replace it.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No logo yet. Upload PNG, JPEG, WebP, or GIF (max 1 MB).
          </p>
        )}
        <Input
          id="settings-institute-logo-file"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-institute-logo">
          Or logo URL{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="settings-institute-logo"
          name="logoUrl"
          type="url"
          defaultValue={institute.logoUrl ?? ""}
          placeholder="https://example.com/logo.png"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          If you upload a file above, it takes priority over this URL.
        </p>
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
