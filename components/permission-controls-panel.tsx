"use client";

import { useActionState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PermissionEffect } from "@/lib/generated/prisma/enums";
import type { PermissionControlRow } from "@/server/user-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";

export interface SetPermissionState {
  error?: string;
  ok?: boolean;
}

export type SetPermissionAction = (
  prevState: SetPermissionState,
  formData: FormData,
) => Promise<SetPermissionState>;

interface PermissionControlsPanelProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  permissions: PermissionControlRow[];
  action: SetPermissionAction;
  framed?: boolean;
}

function groupPermissions(rows: PermissionControlRow[]) {
  return rows.reduce<Map<string, PermissionControlRow[]>>((groups, row) => {
    const existing = groups.get(row.domain) ?? [];
    existing.push(row);
    groups.set(row.domain, existing);
    return groups;
  }, new Map());
}

function PermissionControlForm({
  row,
  action,
}: {
  row: PermissionControlRow;
  action: SetPermissionAction;
}) {
  const [state, formAction, pending] = useActionState<
    SetPermissionState,
    FormData
  >(action, {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Permission updated");
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
    >
      <input type="hidden" name="permission" value={row.permission} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{row.label}</span>
          <Badge variant={row.effectiveEnabled ? "default" : "muted"}>
            {row.effectiveEnabled ? "Enabled" : "Disabled"}
          </Badge>
          {row.defaultEnabled && <Badge variant="outline">Default</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{row.description}</p>
        <p className="text-xs text-muted-foreground">{row.permission}</p>
        {state.error && <FormMessage variant="error">{state.error}</FormMessage>}
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Override
        <select
          name="effect"
          defaultValue={row.explicitEffect ?? "DEFAULT"}
          className="h-9 min-w-36 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="DEFAULT">Role default</option>
          <option value={PermissionEffect.ALLOW}>Allow</option>
          <option value={PermissionEffect.DENY}>Deny</option>
        </select>
      </label>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

export function PermissionControlsPanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
  permissions,
  action,
  framed = true,
}: PermissionControlsPanelProps) {
  const grouped = groupPermissions(permissions);
  const content = (
    <>
      <CardHeader className={framed ? undefined : "px-0 pt-0"}>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={framed ? "space-y-6" : "space-y-6 px-0 pb-0"}>
        {permissions.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={emptyTitle}
            description={emptyDescription}
            className="rounded-md"
          />
        ) : (
          [...grouped.entries()].map(([domain, rows]) => (
            <section key={domain} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {domain}
              </h3>
              <div className="divide-y divide-border rounded-md border border-border">
                {rows.map((row) => (
                  <PermissionControlForm
                    key={row.permission}
                    row={row}
                    action={action}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </>
  );

  if (!framed) {
    return <section className="mt-4">{content}</section>;
  }

  return (
    <Card className="mt-8">
      {content}
    </Card>
  );
}
