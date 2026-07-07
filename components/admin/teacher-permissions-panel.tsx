"use client";

import { useActionState, useEffect } from "react";
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
import { FormMessage } from "@/components/ui/form-message";
import {
  setTeacherPermissionAction,
  type SetTeacherPermissionState,
} from "@/app/admin/teachers/[teacherId]/actions";

interface TeacherPermissionsPanelProps {
  teacherId: string;
  permissions: PermissionControlRow[];
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
  teacherId,
  row,
}: {
  teacherId: string;
  row: PermissionControlRow;
}) {
  const [state, formAction, pending] = useActionState<
    SetTeacherPermissionState,
    FormData
  >(setTeacherPermissionAction.bind(null, teacherId), {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Teacher permission updated");
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

export function TeacherPermissionsPanel({
  teacherId,
  permissions,
}: TeacherPermissionsPanelProps) {
  const grouped = groupPermissions(permissions);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-base">Teacher permissions</CardTitle>
        <CardDescription>
          Adjust access for this teacher without changing the role defaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {[...grouped.entries()].map(([domain, rows]) => (
          <section key={domain} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{domain}</h3>
            <div className="divide-y divide-border rounded-md border border-border">
              {rows.map((row) => (
                <PermissionControlForm
                  key={row.permission}
                  teacherId={teacherId}
                  row={row}
                />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
