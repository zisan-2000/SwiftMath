"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface StudentContactState {
  ok?: boolean;
  error?: string;
}

interface StudentContactFormProps {
  action: (
    previousState: StudentContactState,
    formData: FormData,
  ) => Promise<StudentContactState>;
  contactNumber: string | null;
}

export function StudentContactForm({
  action,
  contactNumber,
}: StudentContactFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) toast.success("Contact number updated");
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="student-contact-number">Contact number</Label>
        <Input
          id="student-contact-number"
          name="contactNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01712345678"
          defaultValue={contactNumber ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Teachers and admins can also find this student by this number.
        </p>
      </div>
      {state.error ? (
        <FormMessage variant="error">{state.error}</FormMessage>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save contact number"}
      </Button>
    </form>
  );
}
