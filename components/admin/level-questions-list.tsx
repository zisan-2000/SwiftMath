"use client";

import { toast } from "sonner";

import {
  deleteLevelQuestionAction,
  toggleLevelQuestionActiveAction,
} from "@/app/admin/levels/[levelId]/questions/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionDifficulty } from "@/lib/generated/prisma/enums";
import { BookOpen } from "lucide-react";

export interface LevelQuestionRow {
  id: string;
  prompt: string;
  correctAnswer: number;
  category: string | null;
  difficulty: QuestionDifficulty;
  isActive: boolean;
}

function difficultyLabel(d: QuestionDifficulty): string {
  return d.charAt(0) + d.slice(1).toLowerCase();
}

/** Admin list of bank questions with activate/delete controls. */
export function LevelQuestionsList({
  levelId,
  questions,
}: {
  levelId: string;
  questions: LevelQuestionRow[];
}) {
  if (questions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No bank questions yet"
        description="Add fixed prompts below. Until the bank has entries, sessions use dynamic generation from level rules."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {questions.map((q) => (
        <li
          key={q.id}
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-mono text-sm text-foreground">{q.prompt}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Answer: {q.correctAnswer}
              {q.category ? ` · ${q.category}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{difficultyLabel(q.difficulty)}</Badge>
              {!q.isActive && <Badge variant="muted">Inactive</Badge>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <form
              action={async (formData) => {
                const result = await toggleLevelQuestionActiveAction(formData);
                if (result.error) toast.error(result.error);
                else toast.success(q.isActive ? "Question disabled" : "Question enabled");
              }}
            >
              <input type="hidden" name="levelId" value={levelId} />
              <input type="hidden" name="questionId" value={q.id} />
              <input
                type="hidden"
                name="isActive"
                value={q.isActive ? "false" : "true"}
              />
              <Button type="submit" variant="outline" size="sm">
                {q.isActive ? "Disable" : "Enable"}
              </Button>
            </form>
            <form
              action={async (formData) => {
                const result = await deleteLevelQuestionAction(formData);
                if (result.error) toast.error(result.error);
                else toast.success("Question deleted");
              }}
            >
              <input type="hidden" name="levelId" value={levelId} />
              <input type="hidden" name="questionId" value={q.id} />
              <Button type="submit" variant="ghost" size="sm">
                Delete
              </Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
