"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  importLevelQuestionsCsvAction,
  type LevelQuestionImportState,
} from "@/app/admin/levels/[levelId]/questions/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/** Upload a CSV file to bulk-add bank questions for one level. */
export function ImportLevelQuestionsForm({ levelId }: { levelId: string }) {
  const [state, formAction, pending] = useActionState<
    LevelQuestionImportState,
    FormData
  >(importLevelQuestionsCsvAction, {});

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success(`Imported ${state.created} draft question(s) — publish to go live`);
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Columns: <code className="text-xs">prompt</code>,{" "}
        <code className="text-xs">correctAnswer</code>, optional{" "}
        <code className="text-xs">category</code>,{" "}
        <code className="text-xs">difficulty</code> (EASY, MEDIUM, HARD). Up
        to 500 rows per file.
      </p>

      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href={`/admin/levels/${levelId}/questions/import-template`}>
          Download template
        </Link>
      </Button>

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="levelId" value={levelId} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="question-import-file">CSV file</Label>
          <input
            id="question-import-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full max-w-md text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </div>

        {state.error && (
          <FormMessage variant="error">{state.error}</FormMessage>
        )}

        {state.rowErrors && state.rowErrors.length > 0 && (
          <FormMessage variant="error">
            <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
              {state.rowErrors.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </FormMessage>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import CSV"}
        </Button>
      </form>
    </div>
  );
}
