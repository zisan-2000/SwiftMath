"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { setGroupLevelTimeAction } from "@/app/teacher/groups/[groupId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface GroupLevelTimeRuleRow {
  levelId: string;
  name: string;
  orderIndex: number;
  defaultSeconds: number;
  overrideSeconds: number | null;
  effectiveSeconds: number;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      Use default
    </Button>
  );
}

function GroupLevelTimeRow({
  groupId,
  rule,
}: {
  groupId: string;
  rule: GroupLevelTimeRuleRow;
}) {
  const inputId = `time-${rule.levelId}`;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3 align-middle">
        <span className="font-medium text-foreground">
          {rule.orderIndex}. {rule.name}
        </span>
      </td>
      <td className="px-5 py-3 align-middle tabular-nums text-muted-foreground">
        {rule.defaultSeconds}s
      </td>
      <td className="px-5 py-3 align-middle tabular-nums text-foreground">
        {rule.effectiveSeconds}s
        {rule.overrideSeconds != null && (
          <span className="ml-2 text-xs text-muted-foreground">(override)</span>
        )}
      </td>
      <td className="px-5 py-3 align-middle">
        <form
          action={async (formData) => {
            const result = await setGroupLevelTimeAction(formData);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Time limit updated");
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="levelId" value={rule.levelId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId} className="sr-only">
              Override seconds for {rule.name}
            </Label>
            <Input
              id={inputId}
              name="timeLimitSeconds"
              type="number"
              min={1}
              max={3600}
              step={1}
              defaultValue={rule.overrideSeconds ?? ""}
              placeholder={`${rule.defaultSeconds}`}
              className="h-9 w-24 tabular-nums"
              aria-label={`Override seconds for ${rule.name}`}
            />
          </div>
          <SaveButton />
        </form>
      </td>
      <td className="px-5 py-3 align-middle">
        {rule.overrideSeconds != null && (
          <form
            action={async (formData) => {
              const result = await setGroupLevelTimeAction(formData);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success("Using level default");
            }}
          >
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="levelId" value={rule.levelId} />
            <input type="hidden" name="useDefault" value="true" />
            <ResetButton />
          </form>
        )}
      </td>
    </tr>
  );
}

/** Per-level timed practice overrides for students in this group. */
export function GroupLevelTimeRules({
  groupId,
  rules,
}: {
  groupId: string;
  rules: GroupLevelTimeRuleRow[];
}) {
  if (rules.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Level</th>
            <th className="px-5 py-2.5 font-medium">Default</th>
            <th className="px-5 py-2.5 font-medium">Effective</th>
            <th className="px-5 py-2.5 font-medium">Override (seconds)</th>
            <th className="px-5 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <GroupLevelTimeRow key={rule.levelId} groupId={groupId} rule={rule} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
