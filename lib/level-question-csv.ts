// CSV import/export for institute level question banks.

import { rowsToCsv } from "@/lib/csv";
import { parseLevelQuestionForm } from "@/lib/level-question-form";
import type { ParsedLevelQuestionInput } from "@/lib/level-question-form";
import { QuestionDifficulty } from "@/lib/generated/prisma/enums";

export const LEVEL_QUESTION_CSV_HEADERS = [
  "prompt",
  "correctAnswer",
  "category",
  "difficulty",
] as const;

export const MAX_LEVEL_QUESTION_IMPORT_ROWS = 500;

const HEADER_ALIASES: Record<string, string> = {
  prompt: "prompt",
  question: "prompt",
  correctanswer: "correctAnswer",
  answer: "correctAnswer",
  category: "category",
  difficulty: "difficulty",
};

/** Parse one RFC 4180 CSV record line into cells. */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  cells.push(current);
  return cells;
}

function normalizeDifficulty(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper === "EASY") return QuestionDifficulty.EASY;
  if (upper === "MEDIUM") return QuestionDifficulty.MEDIUM;
  if (upper === "HARD") return QuestionDifficulty.HARD;
  return upper;
}

function isHeaderRow(cells: string[]): boolean {
  const first = cells[0]?.trim().toLowerCase() ?? "";
  const second = cells[1]?.trim().toLowerCase() ?? "";
  return (
    HEADER_ALIASES[first] === "prompt" &&
    (HEADER_ALIASES[second] === "correctAnswer" ||
      second === "correct_answer")
  );
}

/** Downloadable template with header + example rows. */
export function buildLevelQuestionImportTemplate(): string {
  return rowsToCsv([...LEVEL_QUESTION_CSV_HEADERS], [
    ["12 + 7", 19, "Addition", "EASY"],
    ["45 + 38", 83, "Carry practice", "MEDIUM"],
  ]);
}

export type ParseLevelQuestionImportResult =
  | { ok: true; rows: ParsedLevelQuestionInput[] }
  | { ok: false; error: string; rowErrors?: string[] };

/** Parse uploaded CSV text into validated question rows. */
export function parseLevelQuestionImportCsv(
  text: string,
): ParseLevelQuestionImportResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { ok: false, error: "The file is empty." };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  let startIndex = 0;
  const firstCells = parseCsvLine(lines[0]!);
  if (isHeaderRow(firstCells)) {
    startIndex = 1;
  }

  if (startIndex >= lines.length) {
    return { ok: false, error: "The file has a header row but no question rows." };
  }

  const dataLines = lines.slice(startIndex);
  if (dataLines.length > MAX_LEVEL_QUESTION_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Import up to ${MAX_LEVEL_QUESTION_IMPORT_ROWS} questions per file.`,
    };
  }

  const rows: ParsedLevelQuestionInput[] = [];
  const rowErrors: string[] = [];

  for (let i = 0; i < dataLines.length; i += 1) {
    const lineNumber = startIndex + i + 1;
    const cells = parseCsvLine(dataLines[i]!);
    const prompt = cells[0]?.trim() ?? "";
    const correctAnswerRaw = cells[1]?.trim() ?? "";
    const category = cells[2]?.trim() ?? "";
    const difficultyRaw = cells[3]?.trim()
      ? normalizeDifficulty(cells[3]!)
      : QuestionDifficulty.MEDIUM;

    const parsed = parseLevelQuestionForm({
      prompt,
      correctAnswerRaw,
      category,
      difficultyRaw,
    });

    if (!parsed.ok) {
      rowErrors.push(`Row ${lineNumber}: ${parsed.error}`);
      continue;
    }

    rows.push(parsed.data);
  }

  if (rowErrors.length > 0) {
    return {
      ok: false,
      error: "Fix the rows below and try again.",
      rowErrors,
    };
  }

  if (rows.length === 0) {
    return { ok: false, error: "No valid question rows found." };
  }

  return { ok: true, rows };
}
