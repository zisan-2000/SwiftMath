"use client";

import { toast } from "sonner";

import {
  deleteLevelQuestionAction,
  publishLevelQuestionAction,
  toggleLevelQuestionActiveAction,
  unpublishLevelQuestionAction,
} from "@/app/admin/levels/[levelId]/questions/actions";
import { LevelQuestionRow } from "@/components/admin/edit-level-question-form";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionDifficulty, QuestionStatus } from "@/lib/generated/prisma/enums";
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
  curriculumVersionNumber: number | null;
  analytics?: QuestionAnalyticsStat;
}

/** Admin list of bank questions with edit, activate, and delete controls. */
export function LevelQuestionsList({
  levelId,
  activeVersionNumber,
  questions,
}: {
  levelId: string;
  activeVersionNumber: number;
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
        <LevelQuestionRow
          key={q.id}
          levelId={levelId}
          activeVersionNumber={activeVersionNumber}
          question={q}
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
