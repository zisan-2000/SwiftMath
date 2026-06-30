"use client";

import { toast } from "sonner";

import { setGroupQuestionEnabledAction } from "@/app/teacher/groups/[groupId]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

export interface GroupQuestionOverrideRow {
  id: string;
  prompt: string;
  correctAnswer: number;
  category: string | null;
  difficulty: string;
  instituteActive: boolean;
  groupEnabled: boolean;
  effectiveEnabled: boolean;
}

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Teacher toggles for group-specific question enable/disable. */
export function GroupQuestionOverrides({
  groupId,
  levelId,
  rows,
}: {
  groupId: string;
  levelId: string;
  rows: GroupQuestionOverrideRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No bank questions for this level"
        description="Ask your institute admin to add fixed questions, or sessions will use dynamic generation."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-mono text-sm text-foreground">{row.prompt}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Answer: {row.correctAnswer}
              {row.category ? ` · ${row.category}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {difficultyLabel(row.difficulty)}
              </Badge>
              {!row.instituteActive && (
                <Badge variant="muted">Disabled by admin</Badge>
              )}
              {row.instituteActive && !row.groupEnabled && (
                <Badge variant="warning">Off for this group</Badge>
              )}
            </div>
          </div>

          <form
            action={async (formData) => {
              const result = await setGroupQuestionEnabledAction(formData);
              if (result.error) toast.error(result.error);
              else
                toast.success(
                  row.groupEnabled
                    ? "Question disabled for group"
                    : "Question enabled for group",
                );
            }}
            className="shrink-0"
          >
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="levelId" value={levelId} />
            <input type="hidden" name="questionId" value={row.id} />
            <input
              type="hidden"
              name="enabled"
              value={row.groupEnabled ? "false" : "true"}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!row.instituteActive}
            >
              {row.groupEnabled ? "Disable for group" : "Enable for group"}
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
