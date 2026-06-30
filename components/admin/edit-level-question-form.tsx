"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  updateLevelQuestionAction,
  type LevelQuestionFormState,
} from "@/app/admin/levels/[levelId]/questions/actions";
import { QuestionDifficulty, QuestionStatus } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LevelQuestionRow } from "@/components/admin/level-questions-list";
import { formatQuestionAnalyticsLabel } from "@/lib/question-analytics";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/** Inline edit form for one bank question. */
export function EditLevelQuestionForm({
  levelId,
  question,
  onCancel,
}: {
  levelId: string;
  question: LevelQuestionRow;
  onCancel: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        const result: LevelQuestionFormState =
          await updateLevelQuestionAction(formData);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Question updated");
        onCancel();
      }}
      className="flex w-full flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="levelId" value={levelId} />
      <input type="hidden" name="questionId" value={question.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`edit-prompt-${question.id}`}>Prompt</Label>
          <Input
            id={`edit-prompt-${question.id}`}
            name="prompt"
            defaultValue={question.prompt}
            required
            maxLength={200}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-answer-${question.id}`}>Correct answer</Label>
          <Input
            id={`edit-answer-${question.id}`}
            name="correctAnswer"
            defaultValue={String(question.correctAnswer)}
            inputMode="numeric"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-difficulty-${question.id}`}>Difficulty</Label>
          <select
            id={`edit-difficulty-${question.id}`}
            name="difficulty"
            className={SELECT_CLASS}
            defaultValue={question.difficulty}
          >
            {Object.values(QuestionDifficulty).map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`edit-category-${question.id}`}>Category</Label>
          <Input
            id={`edit-category-${question.id}`}
            name="category"
            defaultValue={question.category ?? ""}
            maxLength={60}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** One bank row with optional inline edit mode. */
export function LevelQuestionRow({
  levelId,
  activeVersionNumber,
  question,
  position,
  reorderEnabled = true,
  reorderPending = false,
  isDragging = false,
  isDropTarget = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleActive,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  levelId: string;
  activeVersionNumber: number;
  question: LevelQuestionRow;
  position: number;
  reorderEnabled?: boolean;
  reorderPending?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onToggleActive: (formData: FormData) => Promise<void>;
  onPublish: (formData: FormData) => Promise<void>;
  onUnpublish: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="px-5 py-4">
        <EditLevelQuestionForm
          levelId={levelId}
          question={question}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const difficultyLabel =
    question.difficulty.charAt(0) +
    question.difficulty.slice(1).toLowerCase();

  const isDraft = question.status === QuestionStatus.DRAFT;
  const isOlderVersion =
    !isDraft &&
    question.curriculumVersionNumber != null &&
    question.curriculumVersionNumber !== activeVersionNumber;
  const analyticsLabel = formatQuestionAnalyticsLabel(question.analytics);

  return (
    <li
      className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between ${
        isDragging ? "opacity-50" : ""
      } ${isDropTarget ? "bg-muted/40" : ""}`}
      onDragOver={reorderEnabled ? onDragOver : undefined}
      onDrop={reorderEnabled ? onDrop : undefined}
    >
      {reorderEnabled && (
        <div className="flex shrink-0 items-start gap-1 sm:pt-0.5">
          <span
            draggable={!reorderPending}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            aria-label={`Drag question ${position} to reorder`}
            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            aria-disabled={reorderPending}
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canMoveUp || reorderPending}
              aria-label={`Move question ${position} up`}
              onClick={onMoveUp}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canMoveDown || reorderPending}
              aria-label={`Move question ${position} down`}
              onClick={onMoveDown}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <span className="hidden w-6 pt-1 text-center text-xs text-muted-foreground sm:inline">
            {position}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm text-foreground">{question.prompt}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Answer: {question.correctAnswer}
          {question.category ? ` · ${question.category}` : ""}
        </p>
        {analyticsLabel ? (
          <p className="mt-1 text-xs text-muted-foreground">{analyticsLabel}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground/80">
            No graded attempts yet
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{difficultyLabel}</Badge>
          {isDraft ? (
            <Badge variant="warning">Draft</Badge>
          ) : isOlderVersion ? (
            <Badge variant="muted">v{question.curriculumVersionNumber}</Badge>
          ) : (
            !question.isActive && <Badge variant="muted">Inactive</Badge>
          )}
          {!isDraft && !isOlderVersion && question.isActive && (
            <Badge variant="secondary">Live</Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        {isDraft ? (
          <form action={onPublish}>
            <input type="hidden" name="levelId" value={levelId} />
            <input type="hidden" name="questionId" value={question.id} />
            <Button type="submit" size="sm">
              Publish
            </Button>
          </form>
        ) : (
          <>
            <form action={onToggleActive}>
              <input type="hidden" name="levelId" value={levelId} />
              <input type="hidden" name="questionId" value={question.id} />
              <input
                type="hidden"
                name="isActive"
                value={question.isActive ? "false" : "true"}
              />
              <Button type="submit" variant="outline" size="sm">
                {question.isActive ? "Disable" : "Enable"}
              </Button>
            </form>
            <form action={onUnpublish}>
              <input type="hidden" name="levelId" value={levelId} />
              <input type="hidden" name="questionId" value={question.id} />
              <Button type="submit" variant="ghost" size="sm">
                Move to draft
              </Button>
            </form>
          </>
        )}
        <form action={onDelete}>
          <input type="hidden" name="levelId" value={levelId} />
          <input type="hidden" name="questionId" value={question.id} />
          <Button type="submit" variant="ghost" size="sm">
            Delete
          </Button>
        </form>
      </div>
    </li>
  );
}
