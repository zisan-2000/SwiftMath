"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  addLevelQuestionAction,
  type LevelQuestionFormState,
} from "@/app/admin/levels/[levelId]/questions/actions";
import { QuestionDifficulty } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add question"}
    </Button>
  );
}

/** Admin form to append one fixed question to the institute bank. */
export function AddLevelQuestionForm({ levelId }: { levelId: string }) {
  return (
    <form
      action={async (formData) => {
        const result: LevelQuestionFormState =
          await addLevelQuestionAction(formData);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Draft question added — publish it to use in sessions");
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="levelId" value={levelId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="question-prompt">Prompt</Label>
          <Input
            id="question-prompt"
            name="prompt"
            placeholder="12 + 7 + 3"
            required
            maxLength={200}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="question-answer">Correct answer</Label>
          <Input
            id="question-answer"
            name="correctAnswer"
            inputMode="numeric"
            placeholder="22"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="question-difficulty">Difficulty</Label>
          <select
            id="question-difficulty"
            name="difficulty"
            className={SELECT_CLASS}
            defaultValue={QuestionDifficulty.MEDIUM}
          >
            {Object.values(QuestionDifficulty).map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="question-category">
            Category{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="question-category"
            name="category"
            placeholder="Carry practice"
            maxLength={60}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        New questions are saved as drafts until you publish them.
      </p>

      <SubmitButton />
    </form>
  );
}
