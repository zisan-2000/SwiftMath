"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addInstituteAction,
  type AddInstituteState,
} from "@/app/super/institutes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/**
 * Form for a Super Admin to create a new institute together with its first
 * ADMIN account. On success the dialog closes and the list re-renders.
 */
export function AddInstituteForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState<
    AddInstituteState,
    FormData
  >(addInstituteAction, {});

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Institute created");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-foreground">
          Institute
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="institute-name">Name</Label>
            <Input
              id="institute-name"
              name="name"
              placeholder="Acme Abacus Academy"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="institute-slug">Slug</Label>
            <Input
              id="institute-slug"
              name="slug"
              placeholder="acme"
              pattern="[a-z0-9\-]+"
              autoComplete="off"
              required
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Slug is the URL-safe id: lowercase letters, numbers, and hyphens only.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="institute-tagline">
            Tagline{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id="institute-tagline"
            name="tagline"
            placeholder="Mental-math mastery for every student"
            maxLength={120}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="institute-logo">
            Logo URL{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id="institute-logo"
            name="logoUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            autoComplete="off"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-foreground">
          First admin
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-name">Full name</Label>
            <Input
              id="admin-name"
              name="adminName"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              name="adminEmail"
              type="email"
              placeholder="jane@acme.test"
              autoComplete="off"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password">Temporary password</Label>
            <Input
              id="admin-password"
              name="adminPassword"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>
      </fieldset>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create institute"}
        </Button>
      </div>
    </form>
  );
}
