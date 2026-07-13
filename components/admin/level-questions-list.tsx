"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteLevelQuestionAction,
  publishLevelQuestionAction,
  reorderLevelQuestionsAction,
  toggleLevelQuestionActiveAction,
  unpublishLevelQuestionAction,
} from "@/app/admin/levels/[levelId]/questions/actions";
import { LevelQuestionRow } from "@/components/admin/edit-level-question-form";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionDifficulty, QuestionStatus } from "@/lib/generated/prisma/enums";
import { applyDragReorder, applyMoveInOrder } from "@/lib/level-question-order";
import type { QuestionAnalyticsStat } from "@/lib/question-analytics";
import { BookOpen } from "lucide-react";

export interface LevelQuestionRow {
  id: string;
  prompt: string;
  correctAnswer: number;
  category: string | null;
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  isActive: boolean;
  orderIndex: number;
  curriculumVersionNumber: number | null;
  analytics?: QuestionAnalyticsStat;
}

/** Admin list of bank questions with edit, reorder, activate, and delete controls. */
export function LevelQuestionsList({
  levelId,
  activeVersionNumber,
  questions,
  reorderEnabled = true,
}: {
  levelId: string;
  activeVersionNumber: number;
  questions: LevelQuestionRow[];
  reorderEnabled?: boolean;
}) {
  const [items, setItems] = useState(questions);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No bank questions yet"
        description="Add fixed prompts below. Until the bank has entries, sessions use dynamic generation from level rules."
      />
    );
  }

  function persistOrder(nextIds: string[], previousItems: LevelQuestionRow[]) {
    startTransition(async () => {
      const result = await reorderLevelQuestionsAction(levelId, nextIds);
      if (result.error) {
        toast.error(result.error);
        setItems(previousItems);
        return;
      }
      toast.success("Order saved");
    });
  }

  function handleMove(questionId: string, direction: "up" | "down") {
    const previousItems = items;
    const ids = items.map((item) => item.id);
    const nextIds = applyMoveInOrder(ids, questionId, direction);
    if (!nextIds) return;

    const byId = new Map(items.map((item) => [item.id, item] as const));
    setItems(nextIds.map((id, orderIndex) => ({ ...byId.get(id)!, orderIndex })));
    persistOrder(nextIds, previousItems);
  }

  function handleDragStart(event: React.DragEvent, index: number) {
    if (!reorderEnabled || isPending) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDragIndex(index);
    setDropIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    if (!reorderEnabled || dragIndex === null) return;
    event.preventDefault();
    setDropIndex(index);
  }

  function handleDrop(index: number) {
    if (!reorderEnabled || dragIndex === null) return;

    const previousItems = items;
    const ids = items.map((item) => item.id);
    const nextIds = applyDragReorder(ids, dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);

    if (!nextIds) return;

    const byId = new Map(items.map((item) => [item.id, item] as const));
    setItems(nextIds.map((id, orderIndex) => ({ ...byId.get(id)!, orderIndex })));
    persistOrder(nextIds, previousItems);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((q, index) => (
        <LevelQuestionRow
          key={q.id}
          levelId={levelId}
          activeVersionNumber={activeVersionNumber}
          question={q}
          position={index + 1}
          reorderEnabled={reorderEnabled}
          reorderPending={isPending}
          isDragging={dragIndex === index}
          isDropTarget={dropIndex === index && dragIndex !== null && dragIndex !== index}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
          onMoveUp={() => handleMove(q.id, "up")}
          onMoveDown={() => handleMove(q.id, "down")}
          onDragStart={(event) => handleDragStart(event, index)}
          onDragOver={(event) => handleDragOver(event, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          onToggleActive={async (formData) => {
            const result = await toggleLevelQuestionActiveAction(formData);
            if (result.error) toast.error(result.error);
            else toast.success(q.isActive ? "Question disabled" : "Question enabled");
          }}
          onPublish={async (formData) => {
            const result = await publishLevelQuestionAction(formData);
            if (result.error) toast.error(result.error);
            else toast.success("Question published");
          }}
          onUnpublish={async (formData) => {
            const result = await unpublishLevelQuestionAction(formData);
            if (result.error) toast.error(result.error);
            else toast.success("Question moved to draft");
          }}
          onDelete={async (formData) => {
            const result = await deleteLevelQuestionAction(formData);
            if (result.error) toast.error(result.error);
            else toast.success("Question deleted");
          }}
        />
      ))}
    </ul>
  );
}
